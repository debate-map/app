use crate::mhtml::write_html_from_mhtml;
use crate::output_path::html_output_path;
use crate::page;
use anyhow::Context;
use headless_chrome::Tab;
use std::path::{Path, PathBuf};
use url::Url;

#[derive(Clone)]
pub struct PageBaker {
	base_output_dir: PathBuf,
}

impl PageBaker {
	pub fn new(base_output_dir: PathBuf) -> Self {
		Self { base_output_dir }
	}

	pub fn bake_tab(&self, tab: &Tab, url: &Url) -> anyhow::Result<PathBuf> {
		let mhtml_contents = page::capture_mhtml(tab)?;
		let html_out_path = html_output_path(&self.base_output_dir, url);

		write_html_from_mhtml(&mhtml_contents, &html_out_path, &self.base_output_dir, url).with_context(|| format!("write {}", html_out_path.display()))?;

		Ok(self.relative_output_path(&html_out_path))
	}

	fn relative_output_path(&self, path: &Path) -> PathBuf {
		path.strip_prefix(&self.base_output_dir).unwrap_or(path).to_path_buf()
	}
}
