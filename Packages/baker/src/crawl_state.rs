use crate::output_path::html_output_path;
use crate::visit::{DEFAULT_MAX_RETRIES, Frontier, VisitFailure};
use anyhow::{Context, bail};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::warn;
use url::Url;

const STATE_DIR: &str = ".baker";
const STATE_FILE: &str = "crawl-state.json";

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct PathRuleSignature {
	pub kind: String,
	pub value: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct CrawlConfigSignature {
	pub root_url: String,
	pub start_urls: Vec<String>,
	pub allow_paths: Vec<PathRuleSignature>,
	pub exclude_paths: Vec<PathRuleSignature>,
	pub query_params: Vec<(String, String)>,
	#[serde(default)]
	pub same_page_route_groups: Vec<SamePageRouteGroupSignature>,
	#[serde(default = "default_max_retries")]
	pub max_retries: usize,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct SamePageRouteGroupSignature {
	pub parent_url: String,
	pub child_paths: Vec<PathRuleSignature>,
	#[serde(default)]
	pub lane_path_segment_count: Option<usize>,
}

#[derive(Clone, Debug)]
struct CrawlStatePaths {
	base_output_dir: PathBuf,
}

impl CrawlStatePaths {
	fn new(base_output_dir: &Path) -> Self {
		Self { base_output_dir: base_output_dir.to_path_buf() }
	}

	fn state_dir(&self) -> PathBuf {
		self.base_output_dir.join(STATE_DIR)
	}

	fn snapshot_path(&self) -> PathBuf {
		self.state_dir().join(STATE_FILE)
	}

	fn has_resume_state(&self) -> bool {
		self.snapshot_path().exists()
	}

	fn html_output_path(&self, url: &Url) -> PathBuf {
		html_output_path(&self.base_output_dir, url)
	}

	fn full_output_path(&self, output_path: &Path) -> PathBuf {
		if output_path.is_absolute() {
			output_path.to_path_buf()
		} else {
			self.base_output_dir.join(output_path)
		}
	}

	fn relative_output_path(&self, output_path: &Path) -> PathBuf {
		output_path.strip_prefix(&self.base_output_dir).unwrap_or(output_path).to_path_buf()
	}
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

	fn from_json_file(path: &Path, expected_config: &CrawlConfigSignature) -> anyhow::Result<Self> {
		let text = fs::read_to_string(path).with_context(|| format!("read crawler state file {}", path.display()))?;
		let snapshot = serde_json::from_str::<Self>(&text).with_context(|| format!("parse crawler state file {}", path.display()))?;
		snapshot.validate(expected_config)?;
		Ok(snapshot)
	}

	fn validate(&self, expected_config: &CrawlConfigSignature) -> anyhow::Result<()> {
		if &self.config != expected_config {
			bail!("crawler resume state was created for a different crawl config; use --force-restart to start fresh");
		}

		Ok(())
	}

	fn into_frontier(self, paths: &CrawlStatePaths, source_path: &Path) -> anyhow::Result<Frontier> {
		let mut frontier = Frontier::new();
		let mut seen_urls = HashSet::new();

		for page in self.pages {
			page.apply_to_frontier(paths, source_path, &mut frontier, &mut seen_urls)?;
		}

		Ok(frontier)
	}
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct CrawlPageSnapshot {
	url: String,
	status: CrawlPageStatus,
	#[serde(skip_serializing_if = "Option::is_none")]
	output_path: Option<String>,
	#[serde(default, skip_serializing_if = "CrawlPageSnapshot::is_zero")]
	attempts: usize,
	#[serde(default, skip_serializing_if = "Option::is_none")]
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

	fn apply_to_frontier(self, paths: &CrawlStatePaths, source_path: &Path, frontier: &mut Frontier, seen_urls: &mut HashSet<Url>) -> anyhow::Result<()> {
		let url = self.parse_url(source_path)?;
		if !seen_urls.insert(url.clone()) {
			bail!("crawler state contains duplicate page {}", url);
		}

		if self.attempts > 0 || self.last_error.is_some() {
			frontier.failures.insert(url.clone(), VisitFailure { attempts: self.attempts, last_error: self.last_error.unwrap_or_default() });
		}

		match self.status {
			CrawlPageStatus::Queued => {
				frontier.to_visit.insert(url);
			},
			CrawlPageStatus::InProgress => {
				frontier.to_visit.insert(url);
			},
			CrawlPageStatus::Ready => {
				let output_path = self.output_path.map(PathBuf::from).unwrap_or_else(|| paths.relative_output_path(&paths.html_output_path(&url)));
				frontier.failures.remove(&url);
				frontier.visited.insert(url.clone());
				frontier.visited_outputs.insert(url, output_path);
			},
			CrawlPageStatus::Failed => {
				frontier.to_visit.remove(&url);
				frontier.visiting.remove(&url);
				frontier.visited.remove(&url);
				frontier.visited_outputs.remove(&url);
				frontier.failures.entry(url).or_default();
			},
		}

		Ok(())
	}

	fn parse_url(&self, source_path: &Path) -> anyhow::Result<Url> {
		Url::parse(&self.url).with_context(|| format!("parse URL from crawler state {}", source_path.display()))
	}

	fn is_zero(value: &usize) -> bool {
		*value == 0
	}
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum CrawlPageStatus {
	Queued,
	InProgress,
	Ready,
	Failed,
}

pub struct CrawlStateStore {
	paths: CrawlStatePaths,
	config: CrawlConfigSignature,
	write_lock: Mutex<()>,
}

impl CrawlStateStore {
	pub fn has_resume_state(base_output_dir: &Path) -> bool {
		CrawlStatePaths::new(base_output_dir).has_resume_state()
	}

	pub fn start_fresh(base_output_dir: &Path, config: CrawlConfigSignature) -> anyhow::Result<Arc<Self>> {
		let store = Arc::new(Self::new(base_output_dir, config)?);
		store.save_snapshot(&CrawlStateSnapshot::empty(store.config.clone()))?;
		Ok(store)
	}

	pub fn resume(base_output_dir: &Path, config: CrawlConfigSignature) -> anyhow::Result<(Arc<Self>, Frontier)> {
		let store = Arc::new(Self::new(base_output_dir, config)?);
		let mut frontier = store.load_frontier()?;
		ResumeReconciler::new(&store.paths).reconcile(&mut frontier);
		store.save_frontier(&frontier)?;
		Ok((store, frontier))
	}

	pub fn save_frontier(&self, frontier: &Frontier) -> anyhow::Result<()> {
		let snapshot = CrawlStateSnapshot::from_frontier(self.config.clone(), frontier);
		self.save_snapshot(&snapshot)
	}

	fn new(base_output_dir: &Path, config: CrawlConfigSignature) -> anyhow::Result<Self> {
		let paths = CrawlStatePaths::new(base_output_dir);
		fs::create_dir_all(paths.state_dir()).with_context(|| format!("create crawler state dir {}", paths.state_dir().display()))?;

		Ok(Self { paths, config, write_lock: Mutex::new(()) })
	}

	fn load_frontier(&self) -> anyhow::Result<Frontier> {
		let snapshot_path = self.paths.snapshot_path();
		if snapshot_path.exists() {
			let snapshot = CrawlStateSnapshot::from_json_file(&snapshot_path, &self.config)?;
			return snapshot.into_frontier(&self.paths, &snapshot_path);
		}

		bail!("no crawler resume state found at {}; use --force-restart to start fresh", snapshot_path.display());
	}

	fn save_snapshot(&self, snapshot: &CrawlStateSnapshot) -> anyhow::Result<()> {
		let _guard = self.write_lock.lock().unwrap();
		SnapshotStateFile::new(self.paths.snapshot_path()).write(snapshot).with_context(|| format!("write crawler state {}", self.paths.snapshot_path().display()))
	}
}

struct SnapshotStateFile {
	path: PathBuf,
}

impl SnapshotStateFile {
	fn new(path: PathBuf) -> Self {
		Self { path }
	}

	fn write(&self, snapshot: &CrawlStateSnapshot) -> anyhow::Result<()> {
		let parent = self.path.parent().with_context(|| format!("state path has no parent: {}", self.path.display()))?;
		fs::create_dir_all(parent).with_context(|| format!("create dir {}", parent.display()))?;

		let file_name = self.path.file_name().and_then(|name| name.to_str()).unwrap_or(STATE_FILE);
		let tmp_path = parent.join(format!(".{file_name}.tmp-{}-{}", std::process::id(), now_nanos()));

		let mut bytes = serde_json::to_vec_pretty(snapshot).context("serialize crawler state")?;
		bytes.push(b'\n');

		let write_result = (|| -> anyhow::Result<()> {
			let mut file = File::create(&tmp_path).with_context(|| format!("create {}", tmp_path.display()))?;
			file.write_all(&bytes).with_context(|| format!("write {}", tmp_path.display()))?;
			file.sync_all().with_context(|| format!("sync {}", tmp_path.display()))?;
			fs::rename(&tmp_path, &self.path).with_context(|| format!("rename {} to {}", tmp_path.display(), self.path.display()))?;
			Ok(())
		})();

		if write_result.is_err() {
			let _ = fs::remove_file(&tmp_path);
		}

		write_result
	}
}

struct ResumeReconciler<'a> {
	paths: &'a CrawlStatePaths,
}

impl<'a> ResumeReconciler<'a> {
	fn new(paths: &'a CrawlStatePaths) -> Self {
		Self { paths }
	}

	fn reconcile(&self, frontier: &mut Frontier) {
		self.requeue_interrupted_pages(frontier);
		self.requeue_failed_pages(frontier);
		self.requeue_ready_pages_missing_output(frontier);
	}

	fn requeue_interrupted_pages(&self, frontier: &mut Frontier) {
		for url in frontier.visiting.drain().collect::<Vec<_>>() {
			if !frontier.visited.contains(&url) {
				frontier.to_visit.insert(url);
			}
		}
	}

	fn requeue_failed_pages(&self, frontier: &mut Frontier) {
		for url in frontier.failures.keys().cloned().collect::<Vec<_>>() {
			if !frontier.visited.contains(&url) && !frontier.visiting.contains(&url) {
				if let Some(failure) = frontier.failures.get_mut(&url) {
					failure.attempts = 0;
				}
				warn!("Requeueing previously failed page {} for resume", url);
				frontier.to_visit.insert(url);
			}
		}
	}

	fn requeue_ready_pages_missing_output(&self, frontier: &mut Frontier) {
		for url in frontier.visited.iter().cloned().collect::<Vec<_>>() {
			let current_html_path = self.paths.html_output_path(&url);
			let stored_output_path = frontier.visited_outputs.get(&url).cloned().unwrap_or_else(|| self.paths.relative_output_path(&current_html_path));
			let stored_output_path = self.paths.full_output_path(&stored_output_path);

			if !current_html_path.exists() {
				warn!("Requeueing {} because ready output {} is missing", url, current_html_path.display());
				frontier.visited.remove(&url);
				frontier.visited_outputs.remove(&url);
				frontier.to_visit.insert(url);
			} else {
				if stored_output_path != current_html_path && stored_output_path.exists() {
					warn!("Ignoring stale ready output {} for {}; current output is {}", stored_output_path.display(), url, current_html_path.display());
				}
				frontier.visited_outputs.insert(url, self.paths.relative_output_path(&current_html_path));
			}
		}
	}
}

fn default_max_retries() -> usize {
	DEFAULT_MAX_RETRIES
}

fn now_nanos() -> u128 {
	SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos()
}

#[cfg(test)]
mod tests {
	use super::*;
	use std::path::Path;

	fn signature() -> CrawlConfigSignature {
		CrawlConfigSignature {
			root_url: "https://debatemap.app/".into(),
			start_urls: vec!["https://debatemap.app/database".into()],
			allow_paths: vec![PathRuleSignature { kind: "starts_with".into(), value: "/database".into() }],
			exclude_paths: vec![],
			query_params: vec![("db".into(), "prod".into())],
			same_page_route_groups: vec![],
			max_retries: DEFAULT_MAX_RETRIES,
		}
	}

	fn temp_output_dir(name: &str) -> PathBuf {
		std::env::temp_dir().join(format!("debatemap-baker-{name}-{}-{}", std::process::id(), now_nanos()))
	}

	fn database_url() -> Url {
		Url::parse("https://debatemap.app/database").unwrap()
	}

	fn state_paths(output_dir: &Path) -> CrawlStatePaths {
		CrawlStatePaths::new(output_dir)
	}

	fn save_frontier(output_dir: &Path, frontier: &Frontier) {
		let store = CrawlStateStore::start_fresh(output_dir, signature()).unwrap();
		store.save_frontier(frontier).unwrap();
	}

	#[test]
	fn resume_requeues_interrupted_pages() {
		let output_dir = temp_output_dir("interrupted");
		let url = database_url();
		let mut frontier = Frontier::new();
		frontier.visiting.insert(url.clone());
		save_frontier(&output_dir, &frontier);

		let (_store, frontier) = CrawlStateStore::resume(&output_dir, signature()).unwrap();

		assert!(frontier.to_visit.contains(&url));
		assert!(frontier.visiting.is_empty());
		assert!(frontier.visited.is_empty());

		fs::remove_dir_all(output_dir).unwrap();
	}

	#[test]
	fn resume_requeues_ready_pages_when_output_is_missing() {
		let output_dir = temp_output_dir("missing-output");
		let url = database_url();
		let mut frontier = Frontier::new();
		frontier.visited.insert(url.clone());
		frontier.visited_outputs.insert(url.clone(), PathBuf::from("database/index.html"));
		save_frontier(&output_dir, &frontier);

		let (_store, frontier) = CrawlStateStore::resume(&output_dir, signature()).unwrap();

		assert!(frontier.to_visit.contains(&url));
		assert!(!frontier.visited.contains(&url));

		fs::remove_dir_all(output_dir).unwrap();
	}

	#[test]
	fn resume_keeps_ready_pages_when_current_output_exists() {
		let output_dir = temp_output_dir("current-output");
		let url = database_url();
		let mut frontier = Frontier::new();
		frontier.visited.insert(url.clone());
		frontier.visited_outputs.insert(url.clone(), PathBuf::from("database/index.html"));
		fs::create_dir_all(output_dir.join("database")).unwrap();
		fs::write(output_dir.join("database").join("index.html"), "page").unwrap();
		save_frontier(&output_dir, &frontier);

		let (_store, frontier) = CrawlStateStore::resume(&output_dir, signature()).unwrap();

		assert!(!frontier.to_visit.contains(&url));
		assert!(frontier.visited.contains(&url));

		fs::remove_dir_all(output_dir).unwrap();
	}

	#[test]
	fn resume_rejects_mismatched_config() {
		let output_dir = temp_output_dir("mismatched-config");
		let config = signature();
		let mut other_config = config.clone();
		other_config.start_urls = vec!["https://debatemap.app/other".into()];

		drop(CrawlStateStore::start_fresh(&output_dir, config).unwrap());

		let err = match CrawlStateStore::resume(&output_dir, other_config) {
			Ok(_) => panic!("resume should reject mismatched config"),
			Err(err) => err,
		};

		assert!(err.to_string().contains("different crawl config"));

		fs::remove_dir_all(output_dir).unwrap();
	}

	#[test]
	fn resume_requeues_exhausted_failures() {
		let output_dir = temp_output_dir("exhausted-failure");
		let url = database_url();
		let mut frontier = Frontier::new();
		frontier.failures.insert(url.clone(), VisitFailure { attempts: DEFAULT_MAX_RETRIES, last_error: "permanent failure".into() });
		save_frontier(&output_dir, &frontier);

		let (_store, frontier) = CrawlStateStore::resume(&output_dir, signature()).unwrap();

		assert!(frontier.to_visit.contains(&url));
		assert!(!frontier.visiting.contains(&url));
		assert_eq!(frontier.failures.get(&url).unwrap().attempts, 0);
		assert_eq!(frontier.failures.get(&url).unwrap().last_error, "permanent failure");

		fs::remove_dir_all(output_dir).unwrap();
	}

	#[test]
	fn state_file_is_a_single_snapshot() {
		let output_dir = temp_output_dir("single-snapshot");
		let url = database_url();
		let store = CrawlStateStore::start_fresh(&output_dir, signature()).unwrap();

		let mut frontier = Frontier::new();
		frontier.to_visit.insert(url.clone());
		store.save_frontier(&frontier).unwrap();
		frontier.to_visit.remove(&url);
		frontier.visiting.insert(url);
		store.save_frontier(&frontier).unwrap();

		let snapshot_text = fs::read_to_string(state_paths(&output_dir).snapshot_path()).unwrap();
		let snapshot: CrawlStateSnapshot = serde_json::from_str(&snapshot_text).unwrap();
		let snapshot_json: serde_json::Value = serde_json::from_str(&snapshot_text).unwrap();

		assert!(snapshot_json.get("version").is_none());
		assert_eq!(snapshot.pages.len(), 1);
		assert_eq!(snapshot.pages[0].status, CrawlPageStatus::InProgress);

		fs::remove_dir_all(output_dir).unwrap();
	}
}
