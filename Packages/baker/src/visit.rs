use crate::crawl_state::CrawlStateStore;
use anyhow::Context;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::Mutex;
use url::Url;

pub const DEFAULT_MAX_RETRIES: usize = 3;
pub const DEFAULT_SAME_PAGE_BATCH_SIZE: usize = usize::MAX;
pub const DEFAULT_SAME_PAGE_MAX_TABS: usize = 1;

#[derive(Clone, Debug)]
pub enum PathRule {
	StartsWith(String),
	Contains(String),
	EndsWith(String),
	Exact(String),
}

impl PathRule {
	pub fn matches(&self, path: &str) -> bool {
		match self {
			PathRule::StartsWith(prefix) => path.starts_with(prefix),
			PathRule::Contains(sub) => path.contains(sub),
			PathRule::EndsWith(suffix) => path.ends_with(suffix),
			PathRule::Exact(p) => path == p,
		}
	}

	pub fn kind_and_value(&self) -> (&'static str, &str) {
		match self {
			PathRule::StartsWith(value) => ("starts_with", value),
			PathRule::Contains(value) => ("contains", value),
			PathRule::EndsWith(value) => ("ends_with", value),
			PathRule::Exact(value) => ("exact", value),
		}
	}
}

#[derive(Clone, Debug)]
pub struct VisitPolicy {
	/// The root URL that defines the crawl scope.
	pub root: Url,
	/// Paths that may be crawled or baked. Empty means every same-origin path is allowed.
	pub allow_paths: Vec<PathRule>,
	/// Paths that must not be crawled or baked.
	pub exclude_paths: Vec<PathRule>,
	/// Query params that should be added to every URL visited.
	pub query_params: Vec<(String, String)>,
}

impl VisitPolicy {
	pub fn new(root: Url, allow_paths: Vec<PathRule>, exclude_paths: Vec<PathRule>, query_params: Vec<(String, String)>) -> Self {
		Self { root, allow_paths, exclude_paths, query_params }
	}

	fn in_scope(&self, url: &Url) -> bool {
		self.root.scheme() == url.scheme() && self.root.host_str() == url.host_str() && self.root.port_or_known_default() == url.port_or_known_default()
	}

	fn path_excluded(&self, url: &Url) -> bool {
		let path = url.path();
		self.exclude_paths.iter().any(|rule| rule.matches(path))
	}

	fn path_allowed(&self, url: &Url) -> bool {
		if self.allow_paths.is_empty() {
			return true;
		}

		let path = url.path();
		self.allow_paths.iter().any(|rule| rule.matches(path))
	}

	pub fn allow(&self, url: &Url) -> bool {
		self.in_scope(url) && self.path_allowed(url) && !self.path_excluded(url)
	}
}

#[derive(Clone, Debug)]
pub struct SamePageRouteGroup {
	pub parent: Url,
	pub child_paths: Vec<PathRule>,
	pub max_tabs: usize,
	pub batch_size: usize,
	pub lane_path_segment_count: Option<usize>,
}

impl SamePageRouteGroup {
	pub fn matches_parent(&self, url: &Url) -> bool {
		same_origin(&self.parent, url) && self.parent.path() == url.path()
	}

	pub fn matches_child(&self, url: &Url) -> bool {
		same_origin(&self.parent, url) && self.child_paths.iter().any(|rule| rule.matches(url.path()))
	}

	pub fn lane_key(&self, url: &Url) -> String {
		let mut key_url = self.parent.clone();
		key_url.set_query(None);
		key_url.set_fragment(None);

		if let Some(segment_count) = self.lane_path_segment_count {
			let path_segments = url.path_segments().map(|segments| segments.take(segment_count).collect::<Vec<_>>()).unwrap_or_default();
			key_url.set_path(&format!("/{}", path_segments.join("/")));
		}

		key_url.as_str().to_string()
	}

	pub fn parent_url_for_visit(&self, child_url: &Url) -> Url {
		let mut parent = self.parent.clone();
		parent.set_query(child_url.query());
		parent
	}
}

fn same_origin(left: &Url, right: &Url) -> bool {
	left.scheme() == right.scheme() && left.host_str() == right.host_str() && left.port_or_known_default() == right.port_or_known_default()
}

struct VisitUrlBuilder<'a> {
	query_params: &'a [(String, String)],
}

impl<'a> VisitUrlBuilder<'a> {
	fn new(query_params: &'a [(String, String)]) -> Self {
		Self { query_params }
	}

	fn for_visit(&self, url: &Url) -> Url {
		let mut url_with_params = url.clone();
		if !self.query_params.is_empty() {
			let mut query_pairs = url_with_params.query_pairs_mut();
			for (key, value) in self.query_params {
				query_pairs.append_pair(key, value);
			}
		}
		url_with_params
	}
}

struct SamePageBatchTracker;

impl SamePageBatchTracker {
	fn active_count(frontier: &Frontier, lane_key: &str) -> usize {
		frontier.same_page_active_batches.get(lane_key).copied().unwrap_or_default()
	}

	fn is_at_capacity(frontier: &Frontier, group: &SamePageRouteGroup, url: &Url) -> bool {
		Self::active_count(frontier, &group.lane_key(url)) >= group.max_tabs
	}

	fn increment(frontier: &mut Frontier, lane_key: String) {
		*frontier.same_page_active_batches.entry(lane_key).or_default() += 1;
	}

	fn decrement(frontier: &mut Frontier, lane_key: &str) {
		Self::decrement_by_key(&mut frontier.same_page_active_batches, lane_key);
	}

	fn decrement_by_key(active_batches: &mut HashMap<String, usize>, group_key: &str) {
		let Some(active_count) = active_batches.get_mut(group_key) else {
			return;
		};

		*active_count = active_count.saturating_sub(1);
		if *active_count == 0 {
			active_batches.remove(group_key);
		}
	}
}

struct VisitScheduler<'a> {
	frontier: &'a Frontier,
	same_page_route_groups: &'a [SamePageRouteGroup],
}

impl<'a> VisitScheduler<'a> {
	fn new(frontier: &'a Frontier, same_page_route_groups: &'a [SamePageRouteGroup]) -> Self {
		Self { frontier, same_page_route_groups }
	}

	fn next_available_url(&self) -> Option<(&'a Url, Option<&'a SamePageRouteGroup>)> {
		self.frontier.to_visit.iter().find_map(|url| {
			let group = self.same_page_group_for_url(url);
			match group {
				Some(group) if SamePageBatchTracker::is_at_capacity(self.frontier, group, url) => None,
				_ => Some((url, group)),
			}
		})
	}

	fn queued_work_units(&self) -> usize {
		let mut regular_count = 0;
		let mut same_page_lane_queued_counts = HashMap::<(usize, String), usize>::new();

		for url in &self.frontier.to_visit {
			if let Some(group_index) = self.same_page_group_index_for_url(url) {
				let group = &self.same_page_route_groups[group_index];
				*same_page_lane_queued_counts.entry((group_index, group.lane_key(url))).or_default() += 1;
			} else {
				regular_count += 1;
			}
		}

		regular_count + same_page_lane_queued_counts.into_iter().map(|((group_index, lane_key), queued_count)| self.group_work_units(queued_count, &self.same_page_route_groups[group_index], &lane_key)).sum::<usize>()
	}

	fn same_page_group_for_url(&self, url: &Url) -> Option<&'a SamePageRouteGroup> {
		self.same_page_route_groups.iter().find(|group| group.matches_child(url))
	}

	fn same_page_group_index_for_url(&self, url: &Url) -> Option<usize> {
		self.same_page_route_groups.iter().position(|group| group.matches_child(url))
	}

	fn group_work_units(&self, queued_count: usize, group: &SamePageRouteGroup, lane_key: &str) -> usize {
		if queued_count == 0 {
			return 0;
		}

		let active_count = SamePageBatchTracker::active_count(self.frontier, lane_key);
		let available_tabs = group.max_tabs.saturating_sub(active_count);
		let needed_batches = queued_count.div_ceil(group.batch_size);
		needed_batches.min(available_tabs)
	}
}

/// Tracks URLs through the crawler lifecycle.
///
/// - **to_visit:** URLs discovered but not yet assigned to a crawler.
/// - **visiting:** URLs currently being processed (loaded, expanded, and baked).
/// - **visited:** URLs successfully processed, all links and buttons extracted and queued for future visits.
pub struct Frontier {
	/// URLs waiting to be crawled.
	pub(crate) to_visit: HashSet<Url>,
	/// URLs currently being crawled.
	pub(crate) visiting: HashSet<Url>,
	/// URLs fully crawled and processed.
	pub(crate) visited: HashSet<Url>,
	/// Output file paths for visited URLs, relative to the configured output directory.
	pub(crate) visited_outputs: HashMap<Url, PathBuf>,
	/// URLs that have failed at least once. Entries with no queued/visiting state are terminal.
	pub(crate) failures: HashMap<Url, VisitFailure>,
	/// In-memory same-page batches currently owned by worker tabs.
	pub(crate) same_page_active_batches: HashMap<String, usize>,
}

impl Frontier {
	pub fn new() -> Self {
		Frontier {
			to_visit: HashSet::new(),
			visiting: HashSet::new(),
			visited: HashSet::new(),
			visited_outputs: HashMap::new(),
			failures: HashMap::new(),
			same_page_active_batches: HashMap::new(),
		}
	}

	pub fn seen_any(&self, normalized_url: &Url) -> bool {
		self.to_visit.contains(normalized_url) || self.visiting.contains(normalized_url) || self.visited.contains(normalized_url) || self.failures.contains_key(normalized_url)
	}

	pub fn is_drained(&self) -> bool {
		self.to_visit.is_empty() && self.visiting.is_empty()
	}

	pub fn is_empty(&self) -> bool {
		self.to_visit.is_empty() && self.visiting.is_empty() && self.visited.is_empty() && self.visited_outputs.is_empty() && self.failures.is_empty() && self.same_page_active_batches.is_empty()
	}
}

impl Default for Frontier {
	fn default() -> Self {
		Self::new()
	}
}

#[derive(Debug)]
pub enum VisitQueueState {
	Ready(Url),
	Waiting,
	Done,
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct VisitFailure {
	pub attempts: usize,
	pub last_error: String,
}

#[derive(Debug, Eq, PartialEq)]
pub enum FailedVisitAction {
	Requeued { attempts: usize, max_retries: usize },
	Exhausted { attempts: usize, max_retries: usize },
	Ignored,
}

#[derive(Debug)]
pub struct RecordedLinks {
	pub queued_urls: Vec<Url>,
	pub reserved_urls: Vec<Url>,
}

pub struct GlobalVisitState {
	/// Global visit policy used to decide which URLs are allowed.
	visit_policy: VisitPolicy,
	frontier: Mutex<Frontier>,
	state_store: Option<Arc<CrawlStateStore>>,
	max_retries: usize,
}

impl GlobalVisitState {
	pub fn new(visit_policy: VisitPolicy) -> Self {
		Self::with_max_retries(visit_policy, DEFAULT_MAX_RETRIES)
	}

	pub fn with_max_retries(visit_policy: VisitPolicy, max_retries: usize) -> Self {
		Self { visit_policy, frontier: Mutex::new(Frontier::new()), state_store: None, max_retries }
	}

	pub fn with_state_store(visit_policy: VisitPolicy, frontier: Frontier, state_store: Arc<CrawlStateStore>, max_retries: usize) -> Self {
		Self { visit_policy, frontier: Mutex::new(frontier), state_store: Some(state_store), max_retries }
	}

	pub fn normalize_url(url: &Url) -> Url {
		let mut normalized = url.clone();
		normalized.set_fragment(None);
		normalized.set_query(None);
		normalized
	}

	pub fn add_to_visit(&self, url: Url) -> anyhow::Result<bool> {
		Ok(!self.add_many_to_visit([url])?.is_empty())
	}

	pub fn add_many_to_visit<I>(&self, urls: I) -> anyhow::Result<Vec<Url>>
	where
		I: IntoIterator<Item = Url>,
	{
		Ok(self.record_links(urls, [])?.queued_urls)
	}

	pub fn record_links<Q, R>(&self, queued_urls: Q, reserved_urls: R) -> anyhow::Result<RecordedLinks>
	where
		Q: IntoIterator<Item = Url>,
		R: IntoIterator<Item = Url>,
	{
		let mut frontier = self.frontier.lock().unwrap();
		let mut added_queued_urls = Vec::new();
		let mut added_reserved_urls = Vec::new();

		for url in queued_urls {
			let normalized_url = Self::normalize_url(&url);
			if !frontier.seen_any(&normalized_url) && self.visit_policy.allow(&normalized_url) {
				frontier.to_visit.insert(normalized_url.clone());
				added_queued_urls.push(normalized_url);
			}
		}

		for url in reserved_urls {
			let normalized_url = Self::normalize_url(&url);
			if !frontier.seen_any(&normalized_url) && self.visit_policy.allow(&normalized_url) {
				frontier.visiting.insert(normalized_url.clone());
				added_reserved_urls.push(normalized_url);
			}
		}

		if (!added_queued_urls.is_empty() || !added_reserved_urls.is_empty())
			&& let Err(err) = self.save_frontier(&frontier)
		{
			for url in &added_queued_urls {
				frontier.to_visit.remove(url);
			}
			for url in &added_reserved_urls {
				frontier.visiting.remove(url);
			}
			return Err(err).context("save recorded URL state");
		}

		Ok(RecordedLinks { queued_urls: added_queued_urls, reserved_urls: added_reserved_urls.iter().map(|url| self.url_for_visit(url)).collect() })
	}

	fn save_frontier(&self, frontier: &Frontier) -> anyhow::Result<()> {
		if let Some(state_store) = &self.state_store {
			state_store.save_frontier(frontier)?;
		}
		Ok(())
	}

	pub fn take_to_visit(&self) -> anyhow::Result<VisitQueueState> {
		self.take_to_visit_with_groups(&[])
	}

	pub fn take_to_visit_with_groups(&self, same_page_route_groups: &[SamePageRouteGroup]) -> anyhow::Result<VisitQueueState> {
		let mut frontier = self.frontier.lock().unwrap();
		if let Some((url, same_page_lane_key)) = self.scheduler(&frontier, same_page_route_groups).next_available_url().map(|(url, group)| (url.clone(), group.map(|group| group.lane_key(url)))) {
			frontier.to_visit.remove(&url);
			frontier.visiting.insert(url.clone());
			if let Some(lane_key) = &same_page_lane_key {
				SamePageBatchTracker::increment(&mut frontier, lane_key.clone());
			}
			if let Err(err) = self.save_frontier(&frontier) {
				frontier.visiting.remove(&url);
				frontier.to_visit.insert(url.clone());
				if let Some(lane_key) = &same_page_lane_key {
					SamePageBatchTracker::decrement_by_key(&mut frontier.same_page_active_batches, lane_key);
				}
				return Err(err).with_context(|| format!("save started URL {url}"));
			}

			Ok(VisitQueueState::Ready(self.url_for_visit(&url)))
		} else if frontier.is_drained() {
			Ok(VisitQueueState::Done)
		} else {
			Ok(VisitQueueState::Waiting)
		}
	}

	pub fn reserve_many_for_visit<I>(&self, urls: I) -> anyhow::Result<Vec<Url>>
	where
		I: IntoIterator<Item = Url>,
	{
		Ok(self.record_links([], urls)?.reserved_urls)
	}

	pub fn reserve_matching_same_page_children(&self, group: &SamePageRouteGroup, lane_key: &str, limit: usize) -> anyhow::Result<Vec<Url>> {
		if limit == 0 {
			return Ok(Vec::new());
		}

		let mut frontier = self.frontier.lock().unwrap();
		let reserved_urls = frontier.to_visit.iter().filter(|url| group.matches_child(url) && group.lane_key(url) == lane_key).take(limit).cloned().collect::<Vec<_>>();

		for url in &reserved_urls {
			frontier.to_visit.remove(url);
			frontier.visiting.insert(url.clone());
		}

		if !reserved_urls.is_empty()
			&& let Err(err) = self.save_frontier(&frontier)
		{
			for url in &reserved_urls {
				frontier.visiting.remove(url);
				frontier.to_visit.insert(url.clone());
			}
			return Err(err).context("save reserved same-page child URL state");
		}

		Ok(reserved_urls.iter().map(|url| self.url_for_visit(url)).collect())
	}

	pub fn release_same_page_batch(&self, lane_key: &str) {
		let mut frontier = self.frontier.lock().unwrap();
		SamePageBatchTracker::decrement(&mut frontier, lane_key);
	}

	fn url_for_visit(&self, url: &Url) -> Url {
		VisitUrlBuilder::new(&self.visit_policy.query_params).for_visit(url)
	}

	pub fn is_done(&self) -> bool {
		let frontier = self.frontier.lock().unwrap();
		frontier.is_drained()
	}

	pub fn queued_work_units(&self, same_page_route_groups: &[SamePageRouteGroup]) -> usize {
		let frontier = self.frontier.lock().unwrap();
		self.scheduler(&frontier, same_page_route_groups).queued_work_units()
	}

	fn scheduler<'a>(&self, frontier: &'a Frontier, same_page_route_groups: &'a [SamePageRouteGroup]) -> VisitScheduler<'a> {
		VisitScheduler::new(frontier, same_page_route_groups)
	}

	pub fn is_empty(&self) -> bool {
		let frontier = self.frontier.lock().unwrap();
		frontier.is_empty()
	}

	pub fn re_add_failed_visit(&self, url: Url, error: &str) -> anyhow::Result<FailedVisitAction> {
		let normalized_url = Self::normalize_url(&url);
		let mut frontier = self.frontier.lock().unwrap();
		if frontier.visiting.contains(&normalized_url) {
			let had_to_visit = frontier.to_visit.contains(&normalized_url);
			let previous_failure = frontier.failures.get(&normalized_url).cloned();

			frontier.visiting.remove(&normalized_url);
			let failure = frontier.failures.entry(normalized_url.clone()).or_insert_with(|| VisitFailure { attempts: 0, last_error: String::new() });
			failure.attempts += 1;
			failure.last_error = error.to_string();

			let attempts = failure.attempts;
			let action = if attempts >= self.max_retries {
				frontier.to_visit.remove(&normalized_url);
				FailedVisitAction::Exhausted { attempts, max_retries: self.max_retries }
			} else {
				frontier.to_visit.insert(normalized_url.clone());
				FailedVisitAction::Requeued { attempts, max_retries: self.max_retries }
			};

			if let Err(err) = self.save_frontier(&frontier) {
				frontier.to_visit.remove(&normalized_url);
				if had_to_visit {
					frontier.to_visit.insert(normalized_url.clone());
				}
				frontier.visiting.insert(normalized_url.clone());
				if let Some(failure) = previous_failure {
					frontier.failures.insert(normalized_url.clone(), failure);
				} else {
					frontier.failures.remove(&normalized_url);
				}
				return Err(err).with_context(|| format!("save failed URL {normalized_url}"));
			}

			return Ok(action);
		}

		Ok(FailedVisitAction::Ignored)
	}

	pub fn mark_visited(&self, url: Url, output_path: &Path) -> anyhow::Result<()> {
		let normalized_url = Self::normalize_url(&url);
		let mut frontier = self.frontier.lock().unwrap();
		if frontier.visiting.contains(&normalized_url) {
			let previous_failure = frontier.failures.remove(&normalized_url);
			let was_visited = frontier.visited.contains(&normalized_url);
			let previous_output = frontier.visited_outputs.insert(normalized_url.clone(), output_path.to_path_buf());

			frontier.visiting.remove(&normalized_url);
			frontier.visited.insert(normalized_url.clone());
			if let Err(err) = self.save_frontier(&frontier) {
				if !was_visited {
					frontier.visited.remove(&normalized_url);
				}
				if let Some(output_path) = previous_output {
					frontier.visited_outputs.insert(normalized_url.clone(), output_path);
				} else {
					frontier.visited_outputs.remove(&normalized_url);
				}
				if let Some(failure) = previous_failure {
					frontier.failures.insert(normalized_url.clone(), failure);
				}
				frontier.visiting.insert(normalized_url.clone());
				return Err(err).with_context(|| format!("save visited URL {normalized_url}"));
			}
		}

		Ok(())
	}

	pub fn failed_visits(&self) -> Vec<(Url, VisitFailure)> {
		let frontier = self.frontier.lock().unwrap();
		let mut failures = frontier.failures.iter().filter(|(url, _)| !frontier.to_visit.contains(*url) && !frontier.visiting.contains(*url) && !frontier.visited.contains(*url)).map(|(url, failure)| (url.clone(), failure.clone())).collect::<Vec<_>>();
		failures.sort_by(|(left, _), (right, _)| left.as_str().cmp(right.as_str()));
		failures
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use url::Url;

	fn policy(exclude_paths: Vec<PathRule>) -> VisitPolicy {
		VisitPolicy::new(Url::parse("https://debatemap.app").unwrap(), vec![], exclude_paths, vec![])
	}

	#[test]
	fn allows_same_origin_default() {
		let p = policy(vec![]);
		assert!(p.allow(&Url::parse("https://debatemap.app/").unwrap()));
		assert!(p.allow(&Url::parse("https://debatemap.app/debates").unwrap()));
	}

	#[test]
	fn denies_urls_outside_same_origin_scope() {
		let p = policy(vec![]);
		assert!(p.allow(&Url::parse("https://debatemap.app/").unwrap()));
		assert!(!p.allow(&Url::parse("http://debatemap.app/global").unwrap()));
		assert!(!p.allow(&Url::parse("https://debatemap.app:444/global").unwrap()));
		assert!(!p.allow(&Url::parse("https://other.com/").unwrap()));
		assert!(!p.allow(&Url::parse("https://sub.example.com/").unwrap()));
	}

	#[test]
	fn exclude_paths_match_starts_with() {
		let p = policy(vec![PathRule::StartsWith("/debates".into()), PathRule::StartsWith("/global".into())]);
		assert!(!p.allow(&Url::parse("https://debatemap.app/debates").unwrap()));
		assert!(!p.allow(&Url::parse("https://debatemap.app/debates/what-shape-is-the-earth-demo.1xSIqiEQR7u4Xn88Q9_t_g").unwrap()));
		assert!(!p.allow(&Url::parse("https://debatemap.app/global/map").unwrap()));
		assert!(p.allow(&Url::parse("https://debatemap.app/news").unwrap()));
	}

	#[test]
	fn exclude_paths_match_contains() {
		let p = policy(vec![PathRule::Contains("policies".into())]);
		assert!(!p.allow(&Url::parse("https://debatemap.app/policies").unwrap()));
		assert!(!p.allow(&Url::parse("https://debatemap.app/x/y/policies").unwrap()));
		assert!(p.allow(&Url::parse("https://debatemap.app/x?action=policies").unwrap()));
	}

	#[test]
	fn empty_queue_is_done() {
		let state = GlobalVisitState::new(policy(vec![]));
		assert!(matches!(state.take_to_visit().unwrap(), VisitQueueState::Done));
	}

	#[test]
	fn queue_waits_while_url_is_in_progress() {
		let state = GlobalVisitState::new(policy(vec![]));
		let url = Url::parse("https://debatemap.app/").unwrap();
		assert!(state.add_to_visit(url).unwrap());

		let active_url = match state.take_to_visit().unwrap() {
			VisitQueueState::Ready(url) => url,
			other => panic!("expected ready url, got {other:?}"),
		};

		assert!(matches!(state.take_to_visit().unwrap(), VisitQueueState::Waiting));

		state.mark_visited(active_url, std::path::Path::new("index.html")).unwrap();
		assert!(matches!(state.take_to_visit().unwrap(), VisitQueueState::Done));
	}

	#[test]
	fn queue_appends_query_params_to_dispatched_urls() {
		let root = Url::parse("https://debatemap.app").unwrap();
		let state = GlobalVisitState::new(VisitPolicy::new(root.clone(), vec![], vec![], vec![("db".into(), "prod".into())]));
		assert!(state.add_to_visit(root).unwrap());

		let active_url = match state.take_to_visit().unwrap() {
			VisitQueueState::Ready(url) => url,
			other => panic!("expected ready url, got {other:?}"),
		};

		assert_eq!(active_url.query(), Some("db=prod"));
	}

	#[test]
	fn reserved_urls_are_marked_in_progress_and_get_query_params() {
		let root = Url::parse("https://debatemap.app").unwrap();
		let state = GlobalVisitState::new(VisitPolicy::new(root, vec![], vec![], vec![("db".into(), "prod".into()), ("internalCrawler".into(), "1".into())]));
		let url = Url::parse("https://debatemap.app/database/terms/abc?old=1").unwrap();

		let reserved = state.reserve_many_for_visit([url.clone()]).unwrap();

		assert_eq!(reserved.len(), 1);
		assert_eq!(reserved[0].as_str(), "https://debatemap.app/database/terms/abc?db=prod&internalCrawler=1");
		let frontier = state.frontier.lock().unwrap();
		assert!(frontier.visiting.contains(&GlobalVisitState::normalize_url(&url)));
		assert!(frontier.to_visit.is_empty());
	}

	#[test]
	fn same_page_children_count_as_one_work_unit() {
		let root = Url::parse("https://debatemap.app").unwrap();
		let state = GlobalVisitState::new(VisitPolicy::new(root.clone(), vec![], vec![], vec![]));
		let group = SamePageRouteGroup {
			parent: root.join("/database/terms").unwrap(),
			child_paths: vec![PathRule::StartsWith("/database/terms/".into())],
			max_tabs: 1,
			batch_size: 20,
			lane_path_segment_count: None,
		};

		state.add_many_to_visit([root.join("/database").unwrap(), root.join("/database/terms/a").unwrap(), root.join("/database/terms/b").unwrap()]).unwrap();

		assert_eq!(state.queued_work_units(&[group]), 2);
	}

	#[test]
	fn reserves_matching_same_page_children_as_a_batch() {
		let root = Url::parse("https://debatemap.app").unwrap();
		let state = GlobalVisitState::new(VisitPolicy::new(root.clone(), vec![], vec![], vec![("db".into(), "prod".into())]));
		let group = SamePageRouteGroup {
			parent: root.join("/database/terms").unwrap(),
			child_paths: vec![PathRule::StartsWith("/database/terms/".into())],
			max_tabs: 1,
			batch_size: 20,
			lane_path_segment_count: None,
		};
		let child_a = root.join("/database/terms/a").unwrap();
		let child_b = root.join("/database/terms/b").unwrap();
		let other = root.join("/database").unwrap();
		state.add_many_to_visit([child_a.clone(), child_b.clone(), other.clone()]).unwrap();

		let reserved = state.reserve_matching_same_page_children(&group, &group.lane_key(&child_a), group.batch_size).unwrap();

		assert_eq!(reserved.len(), 2);
		assert!(reserved.iter().all(|url| url.query() == Some("db=prod")));
		let frontier = state.frontier.lock().unwrap();
		assert!(frontier.visiting.contains(&child_a));
		assert!(frontier.visiting.contains(&child_b));
		assert!(frontier.to_visit.contains(&other));
	}

	#[test]
	fn same_page_work_units_respect_max_tabs_and_batch_size() {
		let root = Url::parse("https://debatemap.app").unwrap();
		let state = GlobalVisitState::new(VisitPolicy::new(root.clone(), vec![], vec![], vec![]));
		let group = SamePageRouteGroup {
			parent: root.join("/database/terms").unwrap(),
			child_paths: vec![PathRule::StartsWith("/database/terms/".into())],
			max_tabs: 4,
			batch_size: 20,
			lane_path_segment_count: None,
		};

		state.add_many_to_visit((0..100).map(|index| root.join(&format!("/database/terms/{index}")).unwrap())).unwrap();

		assert_eq!(state.queued_work_units(&[group]), 4);
	}

	#[test]
	fn same_page_batch_reservation_respects_limit() {
		let root = Url::parse("https://debatemap.app").unwrap();
		let state = GlobalVisitState::new(VisitPolicy::new(root.clone(), vec![], vec![], vec![]));
		let group = SamePageRouteGroup {
			parent: root.join("/database/terms").unwrap(),
			child_paths: vec![PathRule::StartsWith("/database/terms/".into())],
			max_tabs: 4,
			batch_size: 2,
			lane_path_segment_count: None,
		};
		let child_urls = (0..5).map(|index| root.join(&format!("/database/terms/{index}")).unwrap()).collect::<Vec<_>>();

		state.add_many_to_visit(child_urls.clone()).unwrap();
		let reserved = state.reserve_matching_same_page_children(&group, &group.lane_key(&child_urls[0]), group.batch_size).unwrap();

		assert_eq!(reserved.len(), 2);
		let frontier = state.frontier.lock().unwrap();
		assert_eq!(frontier.visiting.len(), 2);
		assert_eq!(frontier.to_visit.len(), 3);
		assert!(child_urls.iter().any(|url| frontier.to_visit.contains(url)));
	}

	#[test]
	fn same_page_take_respects_active_batch_limit() {
		let root = Url::parse("https://debatemap.app").unwrap();
		let state = GlobalVisitState::new(VisitPolicy::new(root.clone(), vec![], vec![], vec![]));
		let group = SamePageRouteGroup {
			parent: root.join("/database/terms").unwrap(),
			child_paths: vec![PathRule::StartsWith("/database/terms/".into())],
			max_tabs: 1,
			batch_size: 20,
			lane_path_segment_count: None,
		};

		state.add_many_to_visit([root.join("/database/terms/a").unwrap(), root.join("/database/terms/b").unwrap()]).unwrap();

		let first_url = match state.take_to_visit_with_groups(std::slice::from_ref(&group)).unwrap() {
			VisitQueueState::Ready(url) => url,
			other => panic!("expected ready url, got {other:?}"),
		};
		assert!(matches!(state.take_to_visit_with_groups(std::slice::from_ref(&group)).unwrap(), VisitQueueState::Waiting));

		state.release_same_page_batch(&group.lane_key(&first_url));
		assert!(matches!(state.take_to_visit_with_groups(&[group]).unwrap(), VisitQueueState::Ready(_)));
	}

	#[test]
	fn same_page_lane_key_allows_distinct_map_tabs() {
		let root = Url::parse("https://debatemap.app").unwrap();
		let state = GlobalVisitState::new(VisitPolicy::new(root.clone(), vec![], vec![], vec![]));
		let group = SamePageRouteGroup {
			parent: root.join("/debates").unwrap(),
			child_paths: vec![PathRule::StartsWith("/debates/".into())],
			max_tabs: 1,
			batch_size: 20,
			lane_path_segment_count: Some(2),
		};

		state.add_many_to_visit([root.join("/debates/map-a").unwrap(), root.join("/debates/map-a/child").unwrap(), root.join("/debates/map-b").unwrap()]).unwrap();

		let first_url = match state.take_to_visit_with_groups(std::slice::from_ref(&group)).unwrap() {
			VisitQueueState::Ready(url) => url,
			other => panic!("expected first ready url, got {other:?}"),
		};
		let second_url = match state.take_to_visit_with_groups(std::slice::from_ref(&group)).unwrap() {
			VisitQueueState::Ready(url) => url,
			other => panic!("expected second ready url, got {other:?}"),
		};

		assert_ne!(group.lane_key(&first_url), group.lane_key(&second_url));
		assert!(matches!(state.take_to_visit_with_groups(&[group]).unwrap(), VisitQueueState::Waiting));
	}

	#[test]
	fn failed_visits_are_retried_until_exhausted() {
		let state = GlobalVisitState::with_max_retries(policy(vec![]), 2);
		let url = Url::parse("https://debatemap.app/database").unwrap();
		assert!(state.add_to_visit(url.clone()).unwrap());

		let first_attempt = match state.take_to_visit().unwrap() {
			VisitQueueState::Ready(url) => url,
			other => panic!("expected ready url, got {other:?}"),
		};
		assert_eq!(state.re_add_failed_visit(first_attempt, "temporary failure").unwrap(), FailedVisitAction::Requeued { attempts: 1, max_retries: 2 });
		assert!(matches!(state.take_to_visit().unwrap(), VisitQueueState::Ready(_)));

		assert_eq!(state.re_add_failed_visit(url.clone(), "permanent failure").unwrap(), FailedVisitAction::Exhausted { attempts: 2, max_retries: 2 });
		assert!(matches!(state.take_to_visit().unwrap(), VisitQueueState::Done));
		assert_eq!(state.failed_visits().len(), 1);
	}
}
