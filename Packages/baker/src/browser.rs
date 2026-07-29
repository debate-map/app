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
	pub fn launch(headless: bool) -> anyhow::Result<Self> {
		// SPA route switches can stay active without emitting browser-level target events.
		// Keep this process-lifetime guard well above any expected crawl duration.
		let launch_options = LaunchOptionsBuilder::default().headless(headless).idle_browser_timeout(Duration::from_secs(24 * 60 * 60)).args(chrome_args()).build()?;
		Ok(Self { browser: Browser::new(launch_options).context("launch Chrome")? })
	}

	pub fn new_tab(&self) -> anyhow::Result<Arc<Tab>> {
		self.browser.new_tab().context("open Chrome tab")
	}
}

fn chrome_args() -> Vec<&'static OsStr> {
	let mut args: Vec<&OsStr> = DEFAULT_ARGS.iter().map(OsStr::new).collect();

	args.retain(|arg| *arg != OsStr::new("--disable-dev-shm-usage"));
	args.push(OsStr::new("--enable-precise-memory-info")); // exposes accurate performance.memory metrics; it does not raise a memory limit
	args.push(OsStr::new("--renderer-process-limit=8")); // caps renderer processes browser-wide; each tab's top-level document still uses one renderer process
	args.push(OsStr::new("--js-flags=--max-old-space-size=4000")); // raises each v8 isolate's old-space limit; dom and layout memory remain outside it

	args
}
