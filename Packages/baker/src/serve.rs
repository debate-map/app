use anyhow::{Context, bail};
use serde::Deserialize;
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread::{self, JoinHandle, sleep};
use std::time::Duration;
use tracing::{error, info, warn};

#[derive(Debug, Clone, Deserialize)]
pub struct PreviewServerConfig {
	#[serde(default)]
	pub enabled: bool,
	#[serde(default = "default_host")]
	pub host: String,
	#[serde(default = "default_port")]
	pub port: u16,
}

impl Default for PreviewServerConfig {
	fn default() -> Self {
		Self { enabled: false, host: default_host(), port: default_port() }
	}
}

pub struct PreviewServer {
	shutdown: Arc<AtomicBool>,
	handle: Option<JoinHandle<()>>,
}

impl PreviewServer {
	pub fn start(config: PreviewServerConfig, root_dir: PathBuf) -> anyhow::Result<Self> {
		if !config.enabled {
			bail!("preview server config is disabled");
		}

		let bind_addr = format!("{}:{}", config.host, config.port);
		let listener = TcpListener::bind(&bind_addr).with_context(|| format!("bind preview server to {bind_addr}"))?;
		listener.set_nonblocking(true).context("set preview server listener nonblocking")?;

		let local_addr = listener.local_addr().context("read preview server local address")?;
		info!("Serving baked output from {} at http://{}", root_dir.display(), local_addr);

		let shutdown = Arc::new(AtomicBool::new(false));
		let thread_shutdown = shutdown.clone();
		let handle = thread::spawn(move || serve_loop(listener, root_dir, thread_shutdown));

		Ok(Self { shutdown, handle: Some(handle) })
	}
}

impl Drop for PreviewServer {
	fn drop(&mut self) {
		self.shutdown.store(true, Ordering::Relaxed);

		if let Some(handle) = self.handle.take()
			&& handle.join().is_err()
		{
			error!("Preview server thread panicked");
		}
	}
}

fn serve_loop(listener: TcpListener, root_dir: PathBuf, shutdown: Arc<AtomicBool>) {
	while !shutdown.load(Ordering::Relaxed) {
		match listener.accept() {
			Ok((stream, _addr)) => {
				let root_dir = root_dir.clone();
				thread::spawn(move || {
					if let Err(err) = handle_connection(stream, &root_dir) {
						warn!("Preview server request failed: {err}");
					}
				});
			},
			Err(err) if err.kind() == std::io::ErrorKind::WouldBlock => {
				sleep(Duration::from_millis(100));
			},
			Err(err) => {
				error!("Preview server accept failed: {err}");
				sleep(Duration::from_millis(250));
			},
		}
	}
}

fn handle_connection(mut stream: TcpStream, root_dir: &Path) -> anyhow::Result<()> {
	let Some(request) = HttpRequest::read_from(&mut stream)? else {
		return Ok(());
	};

	if !request.is_supported_method() {
		return HttpResponse::method_not_allowed().write(&mut stream, request.is_head());
	}

	match StaticFileResolver::new(root_dir).resolve(&request)? {
		ResolvedRequest::File(path) => {
			let body = fs::read(&path).with_context(|| format!("read {}", path.display()))?;
			let content_type = content_type_for_path(&path);
			HttpResponse::ok(content_type, body).write(&mut stream, request.is_head())
		},
		ResolvedRequest::NotFound => HttpResponse::not_found().write(&mut stream, request.is_head()),
	}
}

struct HttpRequest {
	method: String,
	target: String,
}

impl HttpRequest {
	fn read_from(stream: &mut TcpStream) -> anyhow::Result<Option<Self>> {
		let mut buffer = [0_u8; 8192];
		let read = stream.read(&mut buffer).context("read HTTP request")?;
		if read == 0 {
			return Ok(None);
		}

		let request = String::from_utf8_lossy(&buffer[..read]);
		let first_line = request.lines().next().ok_or_else(|| anyhow::anyhow!("empty HTTP request"))?;
		let mut parts = first_line.split_whitespace();

		Ok(Some(Self { method: parts.next().unwrap_or("").to_string(), target: parts.next().unwrap_or("").to_string() }))
	}

	fn is_supported_method(&self) -> bool {
		self.method == "GET" || self.method == "HEAD"
	}

	fn is_head(&self) -> bool {
		self.method == "HEAD"
	}

	fn path_and_query(&self) -> (&str, &str) {
		self.target.split_once('?').unwrap_or((&self.target, ""))
	}
}

#[derive(Debug)]
enum ResolvedRequest {
	File(PathBuf),
	NotFound,
}

struct StaticFileResolver<'a> {
	root_dir: &'a Path,
}

impl<'a> StaticFileResolver<'a> {
	fn new(root_dir: &'a Path) -> Self {
		Self { root_dir }
	}

	fn resolve(&self, request: &HttpRequest) -> anyhow::Result<ResolvedRequest> {
		let (raw_path, query) = request.path_and_query();
		self.resolve_path(raw_path, query)
	}

	fn resolve_path(&self, raw_path: &str, _query: &str) -> anyhow::Result<ResolvedRequest> {
		if !raw_path.starts_with('/') {
			return Ok(ResolvedRequest::NotFound);
		}

		let decoded_path = percent_decode_path(raw_path)?;
		let relative_segments = safe_segments(&decoded_path)?;
		let mut fs_path = self.root_dir.to_path_buf();
		for segment in &relative_segments {
			fs_path.push(segment);
		}

		if fs_path.is_file() {
			return Ok(ResolvedRequest::File(fs_path));
		}

		let index_path = fs_path.join("index.html");
		if index_path.is_file() {
			return Ok(ResolvedRequest::File(index_path));
		}

		Ok(ResolvedRequest::NotFound)
	}
}

#[cfg(test)]
fn resolve_request_path(root_dir: &Path, raw_path: &str, query: &str) -> anyhow::Result<ResolvedRequest> {
	StaticFileResolver::new(root_dir).resolve_path(raw_path, query)
}

fn safe_segments(path: &str) -> anyhow::Result<Vec<String>> {
	let mut segments = Vec::new();
	for segment in path.trim_matches('/').split('/') {
		if segment.is_empty() {
			continue;
		}
		if segment == "." || segment == ".." || segment.contains('\\') {
			bail!("unsafe preview path segment {segment:?}");
		}
		segments.push(segment.to_string());
	}
	Ok(segments)
}

fn percent_decode_path(path: &str) -> anyhow::Result<String> {
	let bytes = path.as_bytes();
	let mut out = Vec::with_capacity(bytes.len());
	let mut index = 0;

	while index < bytes.len() {
		if bytes[index] == b'%' {
			if index + 2 >= bytes.len() {
				bail!("invalid percent escape in request path");
			}
			let high = hex_value(bytes[index + 1]).ok_or_else(|| anyhow::anyhow!("invalid percent escape in request path"))?;
			let low = hex_value(bytes[index + 2]).ok_or_else(|| anyhow::anyhow!("invalid percent escape in request path"))?;
			out.push((high << 4) | low);
			index += 3;
		} else {
			out.push(bytes[index]);
			index += 1;
		}
	}

	String::from_utf8(out).context("decode request path as UTF-8")
}

fn hex_value(byte: u8) -> Option<u8> {
	match byte {
		b'0'..=b'9' => Some(byte - b'0'),
		b'a'..=b'f' => Some(byte - b'a' + 10),
		b'A'..=b'F' => Some(byte - b'A' + 10),
		_ => None,
	}
}

struct HttpResponse {
	status: u16,
	reason: &'static str,
	content_type: &'static str,
	body: Vec<u8>,
	extra_headers: Vec<(&'static str, String)>,
}

impl HttpResponse {
	fn ok(content_type: &'static str, body: Vec<u8>) -> Self {
		Self { status: 200, reason: "OK", content_type, body, extra_headers: Vec::new() }
	}

	fn not_found() -> Self {
		Self { status: 404, reason: "Not Found", content_type: "text/plain; charset=utf-8", body: b"Not Found".to_vec(), extra_headers: Vec::new() }
	}

	fn method_not_allowed() -> Self {
		Self {
			status: 405,
			reason: "Method Not Allowed",
			content_type: "text/plain; charset=utf-8",
			body: b"Method Not Allowed".to_vec(),
			extra_headers: vec![("Allow", "GET, HEAD".to_string())],
		}
	}

	fn write(&self, stream: &mut TcpStream, is_head: bool) -> anyhow::Result<()> {
		let mut response = format!("HTTP/1.1 {} {}\r\nContent-Length: {}\r\nContent-Type: {}\r\nConnection: close\r\n", self.status, self.reason, self.body.len(), self.content_type);

		for (name, value) in &self.extra_headers {
			response.push_str(name);
			response.push_str(": ");
			response.push_str(value);
			response.push_str("\r\n");
		}

		response.push_str("\r\n");
		stream.write_all(response.as_bytes()).context("write HTTP response headers")?;
		if !is_head {
			stream.write_all(&self.body).context("write HTTP response body")?;
		}
		stream.flush().context("flush HTTP response")?;
		Ok(())
	}
}

fn content_type_for_path(path: &Path) -> &'static str {
	match path.extension().and_then(|ext| ext.to_str()).unwrap_or("") {
		"html" | "htm" => "text/html; charset=utf-8",
		"css" => "text/css; charset=utf-8",
		"js" => "text/javascript; charset=utf-8",
		"json" => "application/json; charset=utf-8",
		"svg" => "image/svg+xml",
		"png" => "image/png",
		"jpg" | "jpeg" => "image/jpeg",
		"gif" => "image/gif",
		"webp" => "image/webp",
		"ico" => "image/x-icon",
		"woff" => "font/woff",
		"woff2" => "font/woff2",
		"ttf" => "font/ttf",
		"otf" => "font/otf",
		"wasm" => "application/wasm",
		"txt" => "text/plain; charset=utf-8",
		_ => "application/octet-stream",
	}
}

fn default_host() -> String {
	"127.0.0.1".into()
}

fn default_port() -> u16 {
	8787
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn root_serves_index_html() {
		let root = std::env::temp_dir().join(format!("debatemap-baker-serve-test-{}-{}", std::process::id(), std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
		fs::create_dir_all(&root).unwrap();
		fs::write(root.join("index.html"), "ok").unwrap();

		let resolved = resolve_request_path(&root, "/", "").unwrap();
		assert!(matches!(resolved, ResolvedRequest::File(_)));

		fs::remove_dir_all(root).unwrap();
	}

	#[test]
	fn directory_index_route_serves_index_html() {
		let root = std::env::temp_dir().join(format!("debatemap-baker-serve-test-index-{}-{}", std::process::id(), std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
		fs::create_dir_all(root.join("database").join("users")).unwrap();
		fs::write(root.join("database").join("users").join("index.html"), "ok").unwrap();

		let resolved = resolve_request_path(&root, "/database/users", "").unwrap();
		assert!(matches!(resolved, ResolvedRequest::File(_)));

		let resolved = resolve_request_path(&root, "/database/users/", "").unwrap();
		assert!(matches!(resolved, ResolvedRequest::File(_)));

		let resolved = resolve_request_path(&root, "/database/users/index.html", "").unwrap();
		assert!(matches!(resolved, ResolvedRequest::File(_)));

		fs::remove_dir_all(root).unwrap();
	}

	#[test]
	fn unsafe_paths_are_rejected() {
		let err = resolve_request_path(Path::new("static"), "/../secret", "").unwrap_err();
		assert!(err.to_string().contains("unsafe preview path"));
	}
}
