use anyhow::Context;
use headless_chrome::browser::DEFAULT_ARGS;
use headless_chrome::{Browser, LaunchOptionsBuilder, Tab};
use std::ffi::OsStr;
use std::sync::Arc;
use std::time::Duration;

pub struct BrowserSession {
	browser: Browser,
}

impl BrowserSession {
	pub fn launch() -> anyhow::Result<Self> {
		let launch_options = LaunchOptionsBuilder::default().headless(false).idle_browser_timeout(Duration::from_secs(600)).args(chrome_args()).build()?;

		Ok(Self { browser: Browser::new(launch_options).context("launch Chrome")? })
	}

	pub fn new_tab(&self) -> anyhow::Result<Arc<Tab>> {
		self.browser.new_tab().context("open Chrome tab")
	}
}

fn chrome_args() -> Vec<&'static OsStr> {
	let mut args: Vec<&OsStr> = DEFAULT_ARGS.iter().map(OsStr::new).collect();

	args.retain(|arg| *arg != OsStr::new("--disable-dev-shm-usage"));
	args.push(OsStr::new("--enable-precise-memory-info"));
	args.push(OsStr::new("--process-per-site"));
	args.push(OsStr::new("--renderer-process-limit=1"));
	args.push(OsStr::new("--js-flags=--max-old-space-size=4000"));

	args
}
