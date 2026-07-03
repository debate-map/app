use crate::browser::BrowserSession;
use crate::config::BakerConfig;
use crate::crawl_state::{CrawlConfigSignature, CrawlStateStore, PathRuleSignature, SamePageRouteGroupSignature};
use crate::output_path::static_route_path;
use crate::serve::{PreviewServer, PreviewServerConfig};
use crate::visit::{Frontier, GlobalVisitState, SamePageRouteGroup, VisitPolicy};
use crate::worker_pool::WorkerPool;
use anyhow::{Context, bail};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::thread::sleep;
use std::time::{Duration, Instant};
use tracing::{info, warn};
use url::Url;

pub struct CrawlerEngine {
	worker_pool: WorkerPool,
	browser: BrowserSession,
	visit_state: Arc<GlobalVisitState>,
	config: CrawlerEngineConfig,
	config_path: PathBuf,
}

#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum CrawlerStartMode {
	Resume,
	ForceRestart,
}

#[derive(Debug, Clone)]
pub struct CrawlerEngineConfig {
	/// The number of crawlers to run
	pub crawler_count: usize,
	/// Failed page attempts before the URL is skipped.
	pub max_retries: usize,
	/// URLs that seed the crawl.
	pub start_urls: Vec<Url>,
	/// The visit policy to follow during crawling
	pub visit_policy: VisitPolicy,
	/// SPA route groups that can be rendered in one already-loaded page.
	pub same_page_route_groups: Vec<SamePageRouteGroup>,
	/// Base folder where all baked sites are stored
	pub base_output_dir: PathBuf,
	/// Optional local static preview server.
	pub serve: PreviewServerConfig,
}

impl CrawlerEngineConfig {
	fn state_signature(&self) -> CrawlConfigSignature {
		let path_rule_signature = |rule: &crate::visit::PathRule| {
			let (kind, value) = rule.kind_and_value();
			PathRuleSignature { kind: kind.to_string(), value: value.to_string() }
		};

		CrawlConfigSignature {
			root_url: self.config_root_url(),
			start_urls: self.start_urls.iter().map(|url| url.as_str().to_string()).collect(),
			allow_paths: self.visit_policy.allow_paths.iter().map(path_rule_signature).collect(),
			exclude_paths: self.visit_policy.exclude_paths.iter().map(path_rule_signature).collect(),
			query_params: self.visit_policy.query_params.clone(),
			same_page_route_groups: self
				.same_page_route_groups
				.iter()
				.map(|group| SamePageRouteGroupSignature {
					parent_url: group.parent.as_str().to_string(),
					child_paths: group.child_paths.iter().map(path_rule_signature).collect(),
					lane_path_segment_count: group.lane_path_segment_count,
				})
				.collect(),
			max_retries: self.max_retries,
		}
	}

	fn config_root_url(&self) -> String {
		self.visit_policy.root.as_str().to_string()
	}
}

impl CrawlerEngine {
	const CONFIG_RELOAD_INTERVAL: Duration = Duration::from_secs(2);
	const SUPERVISOR_SLEEP: Duration = Duration::from_millis(500);

	pub fn new(config: CrawlerEngineConfig, config_path: PathBuf, start_mode: CrawlerStartMode) -> anyhow::Result<Self> {
		let (state_store, frontier) = Self::prepare_crawl_state(&config, start_mode)?;
		let visit_state = Arc::new(GlobalVisitState::with_state_store(config.visit_policy.clone(), frontier, state_store, config.max_retries));
		let browser = BrowserSession::launch()?;

		Ok(CrawlerEngine { worker_pool: WorkerPool::new(), browser, visit_state, config, config_path })
	}

	fn prepare_crawl_state(config: &CrawlerEngineConfig, start_mode: CrawlerStartMode) -> anyhow::Result<(Arc<CrawlStateStore>, Frontier)> {
		let signature = config.state_signature();

		match start_mode {
			CrawlerStartMode::ForceRestart => {
				if config.base_output_dir.exists() {
					info!("Force restart requested; cleaning output directory {:?}", config.base_output_dir);
					fs::remove_dir_all(&config.base_output_dir).with_context(|| format!("remove output dir {}", config.base_output_dir.display()))?;
				}
				fs::create_dir_all(&config.base_output_dir).with_context(|| format!("create output dir {}", config.base_output_dir.display()))?;
				let state_store = CrawlStateStore::start_fresh(&config.base_output_dir, signature)?;
				Ok((state_store, Frontier::default()))
			},
			CrawlerStartMode::Resume => {
				if CrawlStateStore::has_resume_state(&config.base_output_dir) {
					info!("Resuming crawl from state under {:?}", config.base_output_dir);
					return CrawlStateStore::resume(&config.base_output_dir, signature);
				}

				if output_dir_has_entries(&config.base_output_dir)? {
					bail!("output directory {} exists but has no crawler metadata; use --force-restart to delete it and start fresh", config.base_output_dir.display());
				}

				fs::create_dir_all(&config.base_output_dir).with_context(|| format!("create output dir {}", config.base_output_dir.display()))?;
				let state_store = CrawlStateStore::start_fresh(&config.base_output_dir, signature)?;
				Ok((state_store, Frontier::default()))
			},
		}
	}

	fn sync_worker_count(&mut self, max_worker_count: usize) -> anyhow::Result<()> {
		let queued_work_units = self.visit_state.queued_work_units(&self.config.same_page_route_groups);
		self.worker_pool.sync(&self.browser, self.visit_state.clone(), &self.config.base_output_dir, &self.config.same_page_route_groups, max_worker_count, queued_work_units)
	}

	fn reload_desired_worker_count(&self, current_desired_count: usize, last_reload_error: &mut Option<String>) -> usize {
		match BakerConfig::load_runtime(&self.config_path) {
			Ok(runtime_config) => {
				*last_reload_error = None;
				if runtime_config.crawler_count != current_desired_count {
					info!("Reloaded crawler_count from {} to {}", current_desired_count, runtime_config.crawler_count);
				}
				runtime_config.crawler_count
			},
			Err(err) => {
				let msg = err.to_string();
				if last_reload_error.as_deref() != Some(msg.as_str()) {
					warn!("Could not reload runtime config from {}; keeping crawler_count={}: {err}", self.config_path.display(), current_desired_count);
					*last_reload_error = Some(msg);
				}
				current_desired_count
			},
		}
	}

	fn ensure_root_index_entrypoint(&self) -> anyhow::Result<()> {
		let Some(start_url) = self.config.start_urls.first() else {
			return Ok(());
		};

		if static_route_path(start_url) == "/" {
			return Ok(());
		}

		let index_path = self.config.base_output_dir.join("index.html");
		if index_path.exists() {
			return Ok(());
		}

		fs::create_dir_all(&self.config.base_output_dir).with_context(|| format!("create output dir {}", self.config.base_output_dir.display()))?;

		let target = static_route_path(start_url);
		let escaped_target = escape_html_attr(&target);
		let contents = format!("<!doctype html>\n<html><head><meta charset=\"utf-8\"><meta http-equiv=\"refresh\" content=\"0; url={escaped_target}\"><title>Redirecting</title></head><body><a href=\"{escaped_target}\">{escaped_target}</a></body></html>\n");
		fs::write(&index_path, contents).with_context(|| format!("write root entrypoint {}", index_path.display()))?;
		info!("Wrote root entrypoint redirect to {target}");

		Ok(())
	}

	pub fn run(&mut self) -> anyhow::Result<()> {
		self.ensure_root_index_entrypoint()?;

		let _preview_server = if self.config.serve.enabled {
			Some(PreviewServer::start(self.config.serve.clone(), self.config.base_output_dir.clone())?)
		} else {
			None
		};

		if self.visit_state.is_empty() {
			let mut seeded_count = 0;
			for start_url in &self.config.start_urls {
				if self.visit_state.add_to_visit(start_url.clone())? {
					seeded_count += 1;
				}
			}

			if seeded_count == 0 {
				bail!("no start URLs were accepted by the visit policy");
			}
		} else {
			info!("Using queued/visited state loaded from previous crawl");
		}

		let mut desired_worker_count = self.config.crawler_count;
		let mut last_config_check = Instant::now();
		let mut last_reload_error = None;

		if self.visit_state.is_done() {
			self.log_final_summary();
			return Ok(());
		}

		loop {
			if self.visit_state.is_done() {
				break;
			}

			self.sync_worker_count(desired_worker_count)?;

			if last_config_check.elapsed() >= Self::CONFIG_RELOAD_INTERVAL {
				desired_worker_count = self.reload_desired_worker_count(desired_worker_count, &mut last_reload_error);
				last_config_check = Instant::now();
			}

			sleep(Self::SUPERVISOR_SLEEP);
		}

		self.worker_pool.stop_all();
		self.log_final_summary();

		Ok(())
	}

	fn log_final_summary(&self) {
		let failures = self.visit_state.failed_visits();
		if failures.is_empty() {
			info!("Crawler finished without terminal page failures");
			return;
		}

		warn!("Crawler finished with {} page(s) skipped after retry exhaustion", failures.len());
		for (url, failure) in failures.iter().take(20) {
			warn!("Skipped {} after {} attempt(s): {}", url, failure.attempts, failure.last_error);
		}
		if failures.len() > 20 {
			warn!("{} additional skipped page(s) not shown", failures.len() - 20);
		}
	}
}

fn output_dir_has_entries(path: &PathBuf) -> anyhow::Result<bool> {
	if !path.exists() {
		return Ok(false);
	}

	let mut entries = fs::read_dir(path).with_context(|| format!("read output dir {}", path.display()))?;
	Ok(entries.next().transpose()?.is_some())
}

fn escape_html_attr(value: &str) -> String {
	value.replace('&', "&amp;").replace('"', "&quot;").replace('<', "&lt;").replace('>', "&gt;")
}
