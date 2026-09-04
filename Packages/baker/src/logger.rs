use std::{env, panic};
use tracing::level_filters::LevelFilter;
use tracing::{Level, error};
use tracing_subscriber::{filter::Targets, fmt, prelude::*};

pub fn init_logging(default_level: Level) -> anyhow::Result<()> {
	let level = env::var("LOG_LEVEL")
		.ok()
		.and_then(|v| match v.to_lowercase().as_str() {
			"trace" => Some(Level::TRACE),
			"debug" => Some(Level::DEBUG),
			"info" => Some(Level::INFO),
			"warn" => Some(Level::WARN),
			"error" => Some(Level::ERROR),
			_ => None,
		})
		.unwrap_or(default_level);

	let my_crate = env!("CARGO_PKG_NAME");
	let targets = Targets::new().with_default(LevelFilter::OFF).with_target(my_crate, level).with_target("panic", LevelFilter::ERROR);

	let base = fmt::layer().with_thread_names(true).with_file(true).with_line_number(true).with_target(true);
	let stdout_layer = if env::var_os("NO_COLOR").is_some() { base.with_ansi(false) } else { base };

	tracing_subscriber::registry().with(stdout_layer.with_filter(targets)).try_init()?;

	panic::set_hook(Box::new(|info| {
		let bt = std::backtrace::Backtrace::force_capture();
		let msg = info.payload().downcast_ref::<&str>().copied().or_else(|| info.payload().downcast_ref::<String>().map(|s| s.as_str())).unwrap_or("panic payload not &str/String");
		let loc = info.location().map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column())).unwrap_or_else(|| "unknown:?:?".to_string());
		error!(target: "panic", %loc, message = msg, backtrace = %bt, "panic");
	}));
	Ok(())
}
