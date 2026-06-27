use self::config::BakerConfig;
use self::engine::{CrawlerEngine, CrawlerEngineConfig, CrawlerStartMode};
use self::logger::init_logging;
use anyhow::bail;
use std::env;
use std::ffi::OsStr;
use std::path::PathBuf;
use tracing::Level;
use tracing::info;

pub mod browser;
pub mod config;
pub mod crawl_state;
pub mod crawler;
pub mod engine;
pub mod logger;
pub mod mhtml;
pub mod output_path;
pub mod page;
pub mod page_baker;
pub mod serve;
pub mod visit;
pub mod worker_pool;

fn main() -> anyhow::Result<()> {
	init_logging(Level::INFO)?;
	let args = CliArgs::parse_env()?;
	let config_path = args.config_path;
	let start_mode = args.start_mode;
	let config: CrawlerEngineConfig = BakerConfig::load(&config_path)?.into_engine_config()?;

	info!("Starting crawler engine with config loaded from {} and start mode {:?}: {config:#?}", config_path.display(), start_mode);
	let mut engine = CrawlerEngine::new(config, config_path, start_mode)?;
	engine.run()?;

	Ok(())
}

struct CliArgs {
	config_path: PathBuf,
	start_mode: CrawlerStartMode,
}

impl CliArgs {
	fn parse_env() -> anyhow::Result<Self> {
		let mut config_path = None;
		let mut start_mode = CrawlerStartMode::Resume;

		for arg in env::args_os().skip(1) {
			if arg == OsStr::new("--force-restart") {
				start_mode = CrawlerStartMode::ForceRestart;
			} else if arg == OsStr::new("--help") || arg == OsStr::new("-h") {
				Self::print_usage_and_exit();
			} else if config_path.is_none() {
				config_path = Some(PathBuf::from(arg));
			} else {
				bail!("unexpected argument {:?}", arg);
			}
		}

		Ok(Self { config_path: config_path.unwrap_or_else(|| "config.yaml".into()), start_mode })
	}

	fn print_usage_and_exit() -> ! {
		println!("Usage: baker [config.yaml] [--force-restart]");
		std::process::exit(0);
	}
}
