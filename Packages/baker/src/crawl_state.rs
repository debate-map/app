use crate::output_path::html_output_path;
use crate::visit::{Frontier, PathRule, VisitFailure};
use anyhow::{Context, bail};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::warn;
use url::Url;

const STATE_DIR: &str = ".baker";
const STATE_FILE: &str = "crawl-state.json";

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct CrawlConfigSignature {
	pub root_url: String,
	pub start_urls: Vec<String>,
	pub allow_paths: Vec<PathRule>,
	pub exclude_paths: Vec<PathRule>,
	pub query_params: Vec<(String, String)>,
	pub isolated_crawl_groups: Vec<IsolatedCrawlGroupSignature>,
	pub max_retries: usize,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct IsolatedCrawlGroupSignature {
	pub parent_url: String,
	pub child_path_prefix: String,
	pub group_path_segment_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
struct CrawlStateSnapshot {
	config: CrawlConfigSignature,
	pages: Vec<CrawlPageSnapshot>,
}

impl CrawlStateSnapshot {
	fn empty(config: CrawlConfigSignature) -> Self {
		Self { config, pages: Vec::new() }
	}

	fn from_frontier(config: CrawlConfigSignature, frontier: &Frontier) -> Self {
		let mut pages = Vec::new();

		for url in &frontier.to_visit {
			pages.push(CrawlPageSnapshot::new(url, CrawlPageStatus::Queued, None, frontier.failures.get(url)));
		}

		for url in &frontier.visiting {
			pages.push(CrawlPageSnapshot::new(url, CrawlPageStatus::InProgress, None, frontier.failures.get(url)));
		}

		for url in &frontier.visited {
			let output_path = frontier.visited_outputs.get(url).map(|path| path.to_string_lossy().into_owned());
			pages.push(CrawlPageSnapshot::new(url, CrawlPageStatus::Ready, output_path, None));
		}

		for (url, failure) in &frontier.failures {
			if frontier.to_visit.contains(url) || frontier.visiting.contains(url) || frontier.visited.contains(url) {
				continue;
			}

			pages.push(CrawlPageSnapshot::new(url, CrawlPageStatus::Failed, None, Some(failure)));
		}

		pages.sort_by(|left, right| left.url.cmp(&right.url));

		Self { config, pages }
	}

	fn into_frontier(self, base_output_dir: &Path, source_path: &Path) -> anyhow::Result<Frontier> {
		let mut frontier = Frontier::default();
		let mut seen_urls = HashSet::new();

		for page in self.pages {
			let url = Url::parse(&page.url).with_context(|| format!("parse URL from crawler state {}", source_path.display()))?;
			if !seen_urls.insert(url.clone()) {
				bail!("crawler state contains duplicate page {}", url);
			}

			if page.attempts > 0 || page.last_error.is_some() {
				frontier.failures.insert(url.clone(), VisitFailure { attempts: page.attempts, last_error: page.last_error.unwrap_or_default() });
			}

			match page.status {
				CrawlPageStatus::Queued | CrawlPageStatus::InProgress => {
					frontier.to_visit.insert(url);
				},
				CrawlPageStatus::Ready => {
					let default_output = html_output_path(base_output_dir, &url);
					let output_path = page.output_path.map(PathBuf::from).unwrap_or_else(|| default_output.strip_prefix(base_output_dir).unwrap_or(&default_output).to_path_buf());
					frontier.failures.remove(&url);
					frontier.visited.insert(url.clone());
					frontier.visited_outputs.insert(url, output_path);
				},
				CrawlPageStatus::Failed => {
					frontier.failures.entry(url).or_default();
				},
			}
		}

		Ok(frontier)
	}
}

#[derive(Debug, Serialize, Deserialize)]
struct CrawlPageSnapshot {
	url: String,
	status: CrawlPageStatus,
	output_path: Option<String>,
	attempts: usize,
	last_error: Option<String>,
}

impl CrawlPageSnapshot {
	fn new(url: &Url, status: CrawlPageStatus, output_path: Option<String>, failure: Option<&VisitFailure>) -> Self {
		Self {
			url: url.as_str().to_string(),
			status,
			output_path,
			attempts: failure.map_or(0, |failure| failure.attempts),
			last_error: failure.and_then(|failure| if failure.last_error.is_empty() { None } else { Some(failure.last_error.clone()) }),
		}
	}
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum CrawlPageStatus {
	Queued,
	InProgress,
	Ready,
	Failed,
}

pub struct CrawlStateStore {
	base_output_dir: PathBuf,
	snapshot_path: PathBuf,
	config: CrawlConfigSignature,
}

impl CrawlStateStore {
	pub fn has_resume_state(base_output_dir: &Path) -> bool {
		Self::state_path(base_output_dir).exists()
	}

	pub fn start_fresh(base_output_dir: &Path, config: CrawlConfigSignature) -> anyhow::Result<Self> {
		let store = Self::new(base_output_dir, config)?;
		store.save_snapshot(&CrawlStateSnapshot::empty(store.config.clone()))?;
		Ok(store)
	}

	pub fn resume(base_output_dir: &Path, config: CrawlConfigSignature) -> anyhow::Result<(Self, Frontier)> {
		let store = Self::new(base_output_dir, config)?;
		let mut frontier = store.load_frontier()?;
		store.reconcile(&mut frontier);
		store.save_frontier(&frontier)?;
		Ok((store, frontier))
	}

	pub fn save_frontier(&self, frontier: &Frontier) -> anyhow::Result<()> {
		let snapshot = CrawlStateSnapshot::from_frontier(self.config.clone(), frontier);
		self.save_snapshot(&snapshot)
	}

	fn new(base_output_dir: &Path, config: CrawlConfigSignature) -> anyhow::Result<Self> {
		let snapshot_path = Self::state_path(base_output_dir);
		let state_dir = snapshot_path.parent().context("crawler state path has no parent")?;
		fs::create_dir_all(state_dir).with_context(|| format!("create crawler state dir {}", state_dir.display()))?;

		Ok(Self { base_output_dir: base_output_dir.to_path_buf(), snapshot_path, config })
	}

	fn load_frontier(&self) -> anyhow::Result<Frontier> {
		if !self.snapshot_path.exists() {
			bail!("no crawler resume state found at {}; use --force-restart to start fresh", self.snapshot_path.display());
		}

		let text = fs::read_to_string(&self.snapshot_path).with_context(|| format!("read crawler state file {}", self.snapshot_path.display()))?;
		let snapshot: CrawlStateSnapshot = serde_json::from_str(&text).with_context(|| format!("parse crawler state file {}", self.snapshot_path.display()))?;
		if snapshot.config != self.config {
			bail!("crawler resume state was created for a different crawl config; use --force-restart to start fresh");
		}

		snapshot.into_frontier(&self.base_output_dir, &self.snapshot_path)
	}

	fn save_snapshot(&self, snapshot: &CrawlStateSnapshot) -> anyhow::Result<()> {
		let parent = self.snapshot_path.parent().with_context(|| format!("state path has no parent: {}", self.snapshot_path.display()))?;
		let file_name = self.snapshot_path.file_name().and_then(|name| name.to_str()).unwrap_or(STATE_FILE);
		let tmp_path = parent.join(format!(".{file_name}.tmp-{}-{}", std::process::id(), now_nanos()));
		let mut bytes = serde_json::to_vec_pretty(snapshot).context("serialize crawler state")?;
		bytes.push(b'\n');

		let result = (|| -> anyhow::Result<()> {
			let mut file = File::create(&tmp_path).with_context(|| format!("create {}", tmp_path.display()))?;
			file.write_all(&bytes).with_context(|| format!("write {}", tmp_path.display()))?;
			file.sync_all().with_context(|| format!("sync {}", tmp_path.display()))?;
			fs::rename(&tmp_path, &self.snapshot_path).with_context(|| format!("rename {} to {}", tmp_path.display(), self.snapshot_path.display()))
		})();

		if result.is_err() {
			let _ = fs::remove_file(tmp_path);
		}

		result.with_context(|| format!("write crawler state {}", self.snapshot_path.display()))
	}

	fn reconcile(&self, frontier: &mut Frontier) {
		for (url, failure) in &mut frontier.failures {
			if !frontier.visited.contains(url) {
				failure.attempts = 0;
				warn!("Requeueing previously failed page {} for resume", url);
				frontier.to_visit.insert(url.clone());
			}
		}

		for url in frontier.visited.iter().cloned().collect::<Vec<_>>() {
			let output_path = html_output_path(&self.base_output_dir, &url);

			if !output_path.exists() {
				warn!("Requeueing {} because ready output {} is missing", url, output_path.display());
				frontier.visited.remove(&url);
				frontier.visited_outputs.remove(&url);
				frontier.to_visit.insert(url);
			} else {
				let relative_path = output_path.strip_prefix(&self.base_output_dir).unwrap_or(&output_path).to_path_buf();
				frontier.visited_outputs.insert(url, relative_path);
			}
		}
	}

	fn state_path(base_output_dir: &Path) -> PathBuf {
		base_output_dir.join(STATE_DIR).join(STATE_FILE)
	}
}

fn now_nanos() -> u128 {
	SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos()
}

#[cfg(test)]
mod tests {
	use super::*;

	fn signature() -> CrawlConfigSignature {
		CrawlConfigSignature {
			root_url: "https://debatemap.app/".into(),
			start_urls: vec!["https://debatemap.app/database".into()],
			allow_paths: vec![PathRule::StartsWith("/database".into())],
			exclude_paths: vec![],
			query_params: vec![("db".into(), "prod".into())],
			isolated_crawl_groups: vec![],
			max_retries: 3,
		}
	}

	fn temp_output_dir(name: &str) -> PathBuf {
		std::env::temp_dir().join(format!("debatemap-baker-{name}-{}-{}", std::process::id(), now_nanos()))
	}

	#[test]
	fn resume_reconciles_the_frontier() {
		let output_dir = temp_output_dir("resume");
		let interrupted = Url::parse("https://debatemap.app/database/interrupted").unwrap();
		let failed = Url::parse("https://debatemap.app/database/failed").unwrap();
		let ready = Url::parse("https://debatemap.app/database/ready").unwrap();
		let missing = Url::parse("https://debatemap.app/database/missing").unwrap();
		let ready_output = html_output_path(&output_dir, &ready);
		fs::create_dir_all(ready_output.parent().unwrap()).unwrap();
		fs::write(&ready_output, "page").unwrap();

		let mut frontier = Frontier::new();
		frontier.visiting.insert(interrupted.clone());
		frontier.failures.insert(failed.clone(), VisitFailure { attempts: 3, last_error: "permanent failure".into() });
		frontier.visited.extend([ready.clone(), missing.clone()]);
		frontier.visited_outputs.insert(ready.clone(), PathBuf::from("old/ready.html"));
		frontier.visited_outputs.insert(missing.clone(), PathBuf::from("old/missing.html"));

		let config = signature();
		let store = CrawlStateStore::start_fresh(&output_dir, config.clone()).unwrap();
		store.save_frontier(&frontier).unwrap();

		let (_store, resumed) = CrawlStateStore::resume(&output_dir, config.clone()).unwrap();
		assert!(resumed.visiting.is_empty());
		assert!(resumed.to_visit.is_superset(&HashSet::from([interrupted, failed.clone(), missing.clone()])));
		assert_eq!(resumed.failures.get(&failed), Some(&VisitFailure { attempts: 0, last_error: "permanent failure".into() }));
		assert!(resumed.visited.contains(&ready));
		assert!(!resumed.visited.contains(&missing));
		assert_eq!(resumed.visited_outputs.get(&ready), Some(&ready_output.strip_prefix(&output_dir).unwrap().to_path_buf()));

		let mut changed_config = config;
		changed_config.start_urls.push("https://debatemap.app/database/other".into());
		let err = CrawlStateStore::resume(&output_dir, changed_config).err().unwrap();
		assert!(err.to_string().contains("different crawl config"));

		fs::remove_dir_all(output_dir).unwrap();
	}
}
