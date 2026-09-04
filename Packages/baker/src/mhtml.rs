use crate::compression::compress_html;
use crate::output_path::static_route_path;
use anyhow::{Context, anyhow, bail};
use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;
use regex::{Regex, RegexBuilder};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;
use std::time::{SystemTime, UNIX_EPOCH};
use url::{Position, Url};

struct MhtmlPart {
	content_type: String,
	content_location: Option<String>,
	content_id: Option<String>,
	content_transfer_encoding: String,
	body: String,
}

struct ResourcePart {
	part: MhtmlPart,
	asset_path: PathBuf,
	asset_ref: String,
	bytes: Vec<u8>,
}

struct MhtmlArchive {
	parts: Vec<MhtmlPart>,
}

impl MhtmlArchive {
	fn parse(mhtml: &str) -> anyhow::Result<Self> {
		let boundary = extract_boundary(mhtml).context("extract MHTML boundary")?;
		let parts = parse_parts(mhtml, &boundary).context("parse MHTML parts")?;

		if parts.is_empty() {
			bail!("MHTML archive has no parts");
		}

		Ok(Self { parts })
	}

	fn take_root_html(&mut self) -> anyhow::Result<String> {
		let root_index = self.parts.iter().position(|part| part.content_type.starts_with("text/html")).ok_or_else(|| anyhow!("MHTML archive has no HTML root part"))?;
		let root_part = self.parts.remove(root_index);

		Ok(String::from_utf8_lossy(&decode_body(&root_part)?).into_owned())
	}
}

struct ResourcePlanner<'a> {
	asset_dir: &'a Path,
	base_output_dir: &'a Path,
}

impl<'a> ResourcePlanner<'a> {
	fn plan(&self, parts: Vec<MhtmlPart>) -> anyhow::Result<Vec<ResourcePart>> {
		let mut resources = Vec::with_capacity(parts.len());

		for part in parts {
			let bytes = decode_body(&part).with_context(|| format!("decode MHTML part {}", part.content_location.as_deref().unwrap_or("<unknown>")))?;
			// ponytail: decoded bytes are sufficient for one fixed app build; hash rewritten dependency graphs if resources become context-dependent.
			let filename = format!("{:x}.{}", Sha256::digest(&bytes), extension_for_content_type(&part.content_type));
			let asset_path = self.asset_dir.join(filename);
			let asset_ref = absolute_web_path(self.base_output_dir, &asset_path)?;
			resources.push(ResourcePart { part, asset_path, asset_ref, bytes });
		}

		Ok(resources)
	}
}

struct ReferenceRewriter {
	replacements: Vec<(String, String)>,
}

impl ReferenceRewriter {
	fn from_resources(resources: &[ResourcePart]) -> Self {
		let mut replacements = Vec::new();

		for resource in resources {
			if let Some(content_location) = &resource.part.content_location {
				replacements.push((content_location.clone(), resource.asset_ref.clone()));
			}
			if let Some(content_id) = &resource.part.content_id {
				replacements.push((format!("cid:{content_id}"), resource.asset_ref.clone()));
			}
		}

		replacements.sort_by(|a, b| b.0.len().cmp(&a.0.len()));
		Self { replacements }
	}

	fn rewrite(&self, text: &mut String) {
		for (from, to) in &self.replacements {
			*text = text.replace(from, to);
		}
	}
}

pub(crate) struct MhtmlConverter<'a> {
	html_out_path: &'a Path,
	base_output_dir: &'a Path,
	page_url: &'a Url,
}

impl<'a> MhtmlConverter<'a> {
	pub(crate) fn new(html_out_path: &'a Path, base_output_dir: &'a Path, page_url: &'a Url) -> Self {
		Self { html_out_path, base_output_dir, page_url }
	}

	pub(crate) fn write(&self, mhtml: &str) -> anyhow::Result<()> {
		let mut archive = MhtmlArchive::parse(mhtml)?;
		let mut html = archive.take_root_html()?;

		let html_parent = self.html_out_path.parent().ok_or_else(|| anyhow!("HTML output path has no parent: {}", self.html_out_path.display()))?;
		fs::create_dir_all(html_parent).with_context(|| format!("create dir {}", html_parent.display()))?;

		let asset_dir = self.base_output_dir.join("_assets");
		fs::create_dir_all(&asset_dir).with_context(|| format!("create asset dir {}", asset_dir.display()))?;

		let resources = ResourcePlanner { asset_dir: &asset_dir, base_output_dir: self.base_output_dir }.plan(archive.parts)?;
		let reference_rewriter = ReferenceRewriter::from_resources(&resources);

		for resource in &resources {
			self.write_resource(resource, &reference_rewriter)?;
		}

		reference_rewriter.rewrite(&mut html);
		html = rewrite_tag_attribute_urls(&html, "a", "href", self.page_url);
		html = rewrite_tag_attribute_urls(&html, "form", "action", self.page_url);
		let compressed_html = compress_html(html.as_bytes())?;
		Self::write_atomic(self.html_out_path, &compressed_html).with_context(|| format!("write {}", self.html_out_path.display()))?;

		Ok(())
	}

	fn write_resource(&self, resource: &ResourcePart, reference_rewriter: &ReferenceRewriter) -> anyhow::Result<()> {
		if resource.asset_path.exists() {
			return Ok(());
		}

		if is_text_resource(&resource.part.content_type) {
			let mut text = String::from_utf8_lossy(&resource.bytes).into_owned();
			if resource.part.content_type == "text/css" {
				text = self.rebase_css_urls(resource, &text);
			}
			reference_rewriter.rewrite(&mut text);
			return Self::write_atomic(&resource.asset_path, text.as_bytes()).with_context(|| format!("write {}", resource.asset_path.display()));
		}

		Self::write_atomic(&resource.asset_path, &resource.bytes).with_context(|| format!("write {}", resource.asset_path.display()))
	}

	fn write_atomic(path: &Path, bytes: &[u8]) -> anyhow::Result<()> {
		let parent = path.parent().ok_or_else(|| anyhow!("output path has no parent: {}", path.display()))?;
		fs::create_dir_all(parent).with_context(|| format!("create dir {}", parent.display()))?;

		let file_name = path.file_name().and_then(|name| name.to_str()).unwrap_or("output");
		let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos();
		let tmp_path = parent.join(format!(".{file_name}.tmp-{}-{nanos}", std::process::id()));

		fs::write(&tmp_path, bytes).with_context(|| format!("write {}", tmp_path.display()))?;
		if let Err(err) = fs::rename(&tmp_path, path) {
			let _ = fs::remove_file(&tmp_path);
			return Err(err).with_context(|| format!("rename {} to {}", tmp_path.display(), path.display()));
		}

		Ok(())
	}

	// chrome saves css text as-is, so relative url() refs (icon fonts mostly) break once the sheet moves into _assets, this pins them to the sheet's original location
	fn rebase_css_urls(&self, resource: &ResourcePart, css: &str) -> String {
		let Some(sheet_url) = resource.part.content_location.as_deref().and_then(|location| Url::parse(location).ok()) else { return css.to_string() };
		CSS_URL_REF
			.replace_all(css, |caps: &regex::Captures| match self.rebase_css_ref(caps[2].trim(), &sheet_url) {
				Some(rebased) => format!("url({quote}{rebased}{quote})", quote = &caps[1]),
				None => caps[0].to_string(),
			})
			.into_owned()
	}

	// absolute refs and fragments are left alone. same-origin refs stay host-relative like the html links, cdn refs get https since their http redirect has no cors header
	fn rebase_css_ref(&self, target: &str, sheet_url: &Url) -> Option<String> {
		if target.starts_with('#') || Url::parse(target).is_ok() {
			return None;
		}
		let mut url = sheet_url.join(target).ok()?;
		if same_origin(&url, self.page_url) {
			return Some(url[Position::BeforePath..].to_string());
		}
		if url.scheme() == "http" {
			let _ = url.set_scheme("https");
		}
		Some(url.to_string())
	}
}

// matches css url(...) refs, quoted or not, capturing the opening quote (1) and the target (2)
static CSS_URL_REF: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)url\(\s*(['"]?)([^'")]+)['"]?\s*\)"#).expect("valid css url() regex"));

fn extract_boundary(mhtml: &str) -> anyhow::Result<String> {
	let (header_text, _) = split_header_body(mhtml).ok_or_else(|| anyhow!("MHTML archive has no top-level headers"))?;
	let headers = parse_headers(header_text);
	let content_type = headers.get("content-type").ok_or_else(|| anyhow!("MHTML archive has no Content-Type header"))?;

	for param in content_type.split(';').skip(1) {
		let param = param.trim();
		if let Some(value) = param.strip_prefix("boundary=") {
			return Ok(value.trim_matches('"').to_string());
		}
	}

	bail!("MHTML Content-Type has no boundary parameter");
}

fn parse_parts(mhtml: &str, boundary: &str) -> anyhow::Result<Vec<MhtmlPart>> {
	let delimiter = format!("--{boundary}");
	let (_, body) = split_header_body(mhtml).ok_or_else(|| anyhow!("MHTML archive has no body"))?;
	let mut parts = Vec::new();

	for section in body.split(&delimiter).skip(1) {
		let section = section.trim_start_matches(['\r', '\n']);
		if section.starts_with("--") {
			break;
		}

		let section = section.trim_end_matches(['\r', '\n']);
		if section.trim().is_empty() {
			continue;
		}

		let (header_text, body) = split_header_body(section).ok_or_else(|| anyhow!("MHTML part has no headers"))?;
		let headers = parse_headers(header_text);

		parts.push(MhtmlPart {
			content_type: headers.get("content-type").map(|value| value.split(';').next().unwrap_or(value).trim().to_lowercase()).unwrap_or_else(|| "application/octet-stream".into()),
			content_location: headers.get("content-location").cloned(),
			content_id: headers.get("content-id").map(|value| value.trim().trim_start_matches('<').trim_end_matches('>').to_string()),
			content_transfer_encoding: headers.get("content-transfer-encoding").map(|value| value.trim().to_lowercase()).unwrap_or_else(|| "7bit".into()),
			body: body.to_string(),
		});
	}

	Ok(parts)
}

fn split_header_body(text: &str) -> Option<(&str, &str)> {
	if let Some(index) = text.find("\r\n\r\n") {
		return Some((&text[..index], &text[index + 4..]));
	}
	text.find("\n\n").map(|index| (&text[..index], &text[index + 2..]))
}

fn parse_headers(header_text: &str) -> HashMap<String, String> {
	let mut unfolded: Vec<String> = Vec::new();
	for line in header_text.lines() {
		if line.starts_with(' ') || line.starts_with('\t') {
			if let Some(last) = unfolded.last_mut() {
				last.push(' ');
				last.push_str(line.trim());
			}
		} else {
			unfolded.push(line.trim_end_matches('\r').to_string());
		}
	}

	let mut headers = HashMap::new();
	for line in unfolded {
		if let Some((name, value)) = line.split_once(':') {
			headers.insert(name.trim().to_lowercase(), value.trim().to_string());
		}
	}

	headers
}

fn decode_body(part: &MhtmlPart) -> anyhow::Result<Vec<u8>> {
	match part.content_transfer_encoding.as_str() {
		"quoted-printable" => decode_quoted_printable(&part.body),
		"base64" => {
			let compact: String = part.body.chars().filter(|ch| !ch.is_whitespace()).collect();
			BASE64.decode(compact).context("decode base64 body")
		},
		_ => Ok(part.body.as_bytes().to_vec()),
	}
}

fn decode_quoted_printable(input: &str) -> anyhow::Result<Vec<u8>> {
	let bytes = input.as_bytes();
	let mut out = Vec::with_capacity(bytes.len());
	let mut index = 0;

	while index < bytes.len() {
		if bytes[index] == b'=' {
			if index + 1 < bytes.len() && bytes[index + 1] == b'\n' {
				index += 2;
				continue;
			}
			if index + 2 < bytes.len() && bytes[index + 1] == b'\r' && bytes[index + 2] == b'\n' {
				index += 3;
				continue;
			}
			if index + 2 < bytes.len() {
				let high = hex_value(bytes[index + 1]);
				let low = hex_value(bytes[index + 2]);
				if let (Some(high), Some(low)) = (high, low) {
					out.push((high << 4) | low);
					index += 3;
					continue;
				}
			}
		}

		out.push(bytes[index]);
		index += 1;
	}

	Ok(out)
}

fn hex_value(byte: u8) -> Option<u8> {
	match byte {
		b'0'..=b'9' => Some(byte - b'0'),
		b'a'..=b'f' => Some(byte - b'a' + 10),
		b'A'..=b'F' => Some(byte - b'A' + 10),
		_ => None,
	}
}

fn absolute_web_path(base_output_dir: &Path, to_path: &Path) -> anyhow::Result<String> {
	let relative = to_path.strip_prefix(base_output_dir).with_context(|| format!("make {} relative to {}", to_path.display(), base_output_dir.display()))?;
	Ok(format!("/{}", relative.to_string_lossy().replace('\\', "/")))
}

fn rewrite_tag_attribute_urls(input: &str, tag_name: &str, attr_name: &str, page_url: &Url) -> String {
	let mut out = String::with_capacity(input.len());
	let mut cursor = 0;
	let tag_start_regex = tag_start_regex(tag_name);

	while let Some(tag_start) = tag_start_regex.find_at(input, cursor).map(|match_| match_.start()) {
		out.push_str(&input[cursor..tag_start]);

		let Some(tag_end_rel) = input[tag_start..].find('>') else {
			out.push_str(&input[tag_start..]);
			return out;
		};
		let tag_end = tag_start + tag_end_rel + 1;
		out.push_str(&rewrite_attr_in_tag(&input[tag_start..tag_end], attr_name, page_url));
		cursor = tag_end;
	}

	out.push_str(&input[cursor..]);
	out
}

fn rewrite_attr_in_tag(tag: &str, attr_name: &str, page_url: &Url) -> String {
	let mut out = String::with_capacity(tag.len());
	let mut cursor = 0;
	let mut search_from = 0;
	let bytes = tag.as_bytes();

	while let Some(attr_pos_rel) = find_ascii_case_insensitive(&tag[search_from..], attr_name) {
		let attr_pos = search_from + attr_pos_rel;
		if !is_attr_name_boundary(bytes, attr_pos, attr_name.len()) {
			search_from = attr_pos + attr_name.len();
			continue;
		}

		let mut index = attr_pos + attr_name.len();
		while index < bytes.len() && bytes[index].is_ascii_whitespace() {
			index += 1;
		}
		if index >= bytes.len() || bytes[index] != b'=' {
			search_from = attr_pos + attr_name.len();
			continue;
		}
		index += 1;
		while index < bytes.len() && bytes[index].is_ascii_whitespace() {
			index += 1;
		}
		if index >= bytes.len() || !matches!(bytes[index], b'"' | b'\'') {
			search_from = attr_pos + attr_name.len();
			continue;
		}

		let quote = bytes[index] as char;
		let value_start = index + 1;
		let Some(value_end_rel) = tag[value_start..].find(quote) else {
			break;
		};
		let value_end = value_start + value_end_rel;
		let value = &tag[value_start..value_end];

		out.push_str(&tag[cursor..value_start]);
		if let Some(local_url) = local_navigation_url(value, page_url) {
			out.push_str(&local_url);
		} else {
			out.push_str(value);
		}

		cursor = value_end;
		search_from = value_end + 1;
	}

	out.push_str(&tag[cursor..]);
	out
}

fn tag_start_regex(tag_name: &str) -> Regex {
	let pattern = format!(r"<{}(?:[>/\s])", regex::escape(tag_name));
	RegexBuilder::new(&pattern).case_insensitive(true).build().expect("static tag-start regex should compile")
}

fn find_ascii_case_insensitive(haystack: &str, needle: &str) -> Option<usize> {
	haystack.as_bytes().windows(needle.len()).position(|window| window.eq_ignore_ascii_case(needle.as_bytes()))
}

fn is_attr_name_boundary(bytes: &[u8], attr_pos: usize, attr_len: usize) -> bool {
	let valid_before = attr_pos == 0 || !is_attr_name_char(bytes[attr_pos - 1]);
	let after_pos = attr_pos + attr_len;
	let valid_after = after_pos >= bytes.len() || !is_attr_name_char(bytes[after_pos]);
	valid_before && valid_after
}

fn is_attr_name_char(byte: u8) -> bool {
	byte.is_ascii_alphanumeric() || matches!(byte, b':' | b'_' | b'-')
}

fn local_navigation_url(raw_value: &str, page_url: &Url) -> Option<String> {
	let value = raw_value.replace("&amp;", "&");
	let trimmed = value.trim();

	if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with("mailto:") || trimmed.starts_with("tel:") || trimmed.starts_with("javascript:") || trimmed.starts_with("data:") || trimmed.starts_with("blob:") {
		return None;
	}

	let parsed = page_url.join(trimmed).ok()?;
	if !same_origin(page_url, &parsed) {
		return None;
	}

	let mut local = static_route_path(&parsed);
	if let Some(fragment) = parsed.fragment() {
		local.push('#');
		local.push_str(fragment);
	}

	Some(local)
}

fn same_origin(left: &Url, right: &Url) -> bool {
	left.scheme() == right.scheme() && left.host_str() == right.host_str() && left.port_or_known_default() == right.port_or_known_default()
}

fn extension_for_content_type(content_type: &str) -> &'static str {
	match content_type {
		"text/css" => "css",
		"text/html" => "html",
		"text/javascript" | "application/javascript" => "js",
		"image/png" => "png",
		"image/jpeg" => "jpg",
		"image/gif" => "gif",
		"image/svg+xml" => "svg",
		"image/webp" => "webp",
		"image/x-icon" | "image/vnd.microsoft.icon" => "ico",
		"font/woff" | "application/font-woff" => "woff",
		"font/woff2" => "woff2",
		"font/ttf" => "ttf",
		"font/otf" => "otf",
		_ => "bin",
	}
}

fn is_text_resource(content_type: &str) -> bool {
	content_type.starts_with("text/") || matches!(content_type, "application/javascript" | "application/json" | "image/svg+xml")
}
