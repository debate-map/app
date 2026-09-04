use self::compression::decompress_html;
use self::config::BakerConfig;
use self::engine::{CrawlerEngine, CrawlerEngineConfig, CrawlerStartMode};
use self::logger::init_logging;
use self::serve::PreviewServer;
use anyhow::{Context, bail};
use std::env;
use std::ffi::OsStr;
use std::fs;
use std::path::PathBuf;
use tracing::Level;
use tracing::info;

pub mod browser;
pub mod compression;
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
	let config: CrawlerEngineConfig = BakerConfig::load(&config_path)?.into_engine_config()?;

	if args.serve_only {
		let index_path = config.base_output_dir.join("index.html");
		let index = fs::read(&index_path).with_context(|| format!("read baked entrypoint {}; run a fresh bake first", index_path.display()))?;
		decompress_html(&index).with_context(|| format!("baked entrypoint {} is not Brotli-compressed; run a fresh bake first", index_path.display()))?;
		let _server = PreviewServer::start(config.serve, config.base_output_dir)?;
		loop {
			std::thread::park();
		}
	}

	let start_mode = args.start_mode;
	info!("Starting crawler engine with config loaded from {} and start mode {:?}: {config:#?}", config_path.display(), start_mode);
	let mut engine = CrawlerEngine::new(config, config_path, start_mode)?;
	engine.run()?;

	Ok(())
}

struct CliArgs {
	config_path: PathBuf,
	start_mode: CrawlerStartMode,
	serve_only: bool,
}

impl CliArgs {
	fn parse_env() -> anyhow::Result<Self> {
		let mut config_path = None;
		let mut start_mode = CrawlerStartMode::Resume;
		let mut serve_only = false;

		for arg in env::args_os().skip(1) {
			if arg == OsStr::new("--force-restart") {
				start_mode = CrawlerStartMode::ForceRestart;
			} else if arg == OsStr::new("--serve-only") {
				serve_only = true;
			} else if arg == OsStr::new("--help") || arg == OsStr::new("-h") {
				Self::print_usage_and_exit();
			} else if config_path.is_none() {
				config_path = Some(PathBuf::from(arg));
			} else {
				bail!("unexpected argument {:?}", arg);
			}
		}

		if serve_only && matches!(&start_mode, CrawlerStartMode::ForceRestart) {
			bail!("--serve-only cannot be combined with --force-restart");
		}

		Ok(Self { config_path: config_path.unwrap_or_else(|| "config.yaml".into()), start_mode, serve_only })
	}

	fn print_usage_and_exit() -> ! {
		println!("Usage: baker [config.yaml] [--force-restart | --serve-only]");
		std::process::exit(0);
	}
}
