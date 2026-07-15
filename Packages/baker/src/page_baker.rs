use crate::mhtml::MhtmlConverter;
use crate::output_path::html_output_path;
use crate::page;
use anyhow::Context;
use headless_chrome::Tab;
use std::path::PathBuf;
use url::Url;

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

		MhtmlConverter::new(&html_out_path, &self.base_output_dir, url).write(&mhtml_contents).with_context(|| format!("write {}", html_out_path.display()))?;

		Ok(html_out_path.strip_prefix(&self.base_output_dir).unwrap_or(&html_out_path).to_path_buf())
	}
}
