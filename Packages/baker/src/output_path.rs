use std::path::{Path, PathBuf};
use url::Url;

pub fn html_output_path(base_output_dir: &Path, url: &Url) -> PathBuf {
	let mut out = base_output_dir.to_path_buf();
	let path = url.path();

	if path == "/" || path.is_empty() {
		out.push("index.html");
	} else if is_file_like_path(path) {
		out.push(path.trim_start_matches('/'));
	} else {
		out.push(path.trim_matches('/'));
		out.push("index.html");
	}

	out
}

pub fn static_route_path(url: &Url) -> String {
	let path = url.path();
	if path == "/" || path.is_empty() {
		return "/".to_string();
	}

	let segments: Vec<&str> = path.trim_matches('/').split('/').filter(|segment| !segment.is_empty()).collect();

	if segments.is_empty() {
		return "/".to_string();
	}

	let route_path = segments.join("/");

	if is_file_like_path(path) { format!("/{route_path}") } else { format!("/{route_path}/") }
}

fn is_file_like_path(path: &str) -> bool {
	let Some(last_segment) = path.trim_matches('/').split('/').rfind(|segment| !segment.is_empty()) else {
		return false;
	};

	let Some(extension) = Path::new(last_segment).extension().and_then(|ext| ext.to_str()) else {
		return false;
	};

	!path.ends_with('/') && matches!(extension.to_ascii_lowercase().as_str(), "css" | "gif" | "htm" | "html" | "ico" | "jpeg" | "jpg" | "js" | "json" | "map" | "otf" | "png" | "svg" | "ttf" | "txt" | "wasm" | "webp" | "woff" | "woff2" | "xml")
}

#[cfg(test)]
mod tests {
	use super::*;

	fn output_for(path: &str) -> PathBuf {
		let url = Url::parse(&format!("https://debatemap.app{path}")).unwrap();
		html_output_path(Path::new("static"), &url)
	}

	#[test]
	fn extensionless_routes_are_written_as_directory_indexes() {
		assert_eq!(output_for("/"), PathBuf::from("static/index.html"));
		assert_eq!(output_for("/database"), PathBuf::from("static/database/index.html"));
		assert_eq!(output_for("/database/"), PathBuf::from("static/database/index.html"));
		assert_eq!(output_for("/database/users/abc"), PathBuf::from("static/database/users/abc/index.html"));
		assert_eq!(output_for("/debates/how-old-is-the-universe.abc123"), PathBuf::from("static/debates/how-old-is-the-universe.abc123/index.html"));
	}

	#[test]
	fn file_like_routes_keep_their_filename() {
		assert_eq!(output_for("/robots.txt"), PathBuf::from("static/robots.txt"));
		assert_eq!(output_for("/assets/app.css"), PathBuf::from("static/assets/app.css"));
	}

	#[test]
	fn static_route_paths_point_to_directory_indexes() {
		let route = |path: &str| {
			let url = Url::parse(&format!("https://debatemap.app{path}")).unwrap();
			static_route_path(&url)
		};

		assert_eq!(route("/"), "/");
		assert_eq!(route("/database"), "/database/");
		assert_eq!(route("/database/"), "/database/");
		assert_eq!(route("/database/users/abc"), "/database/users/abc/");
		assert_eq!(route("/debates/how-old-is-the-universe.abc123"), "/debates/how-old-is-the-universe.abc123/");
		assert_eq!(route("/robots.txt"), "/robots.txt");
	}
}
