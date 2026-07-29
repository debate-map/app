use crate::crawl_state::CrawlStateStore;
use anyhow::Context;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use url::Url;

pub const DEFAULT_MAX_RETRIES: usize = 3;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", content = "value", rename_all = "snake_case")]
pub enum PathRule {
	StartsWith(String),
	NotStartsWith(String),
	Contains(String),
	EndsWith(String),
	Exact(String),
}

impl PathRule {
	pub fn matches(&self, path: &str) -> bool {
		match self {
			PathRule::StartsWith(prefix) => path.starts_with(prefix),
			PathRule::NotStartsWith(prefix) => !path.starts_with(prefix),
			PathRule::Contains(sub) => path.contains(sub),
			PathRule::EndsWith(suffix) => path.ends_with(suffix),
			PathRule::Exact(p) => path == p,
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

	pub fn allow(&self, url: &Url) -> bool {
		let path = url.path();
		same_origin(&self.root, url) && (self.allow_paths.is_empty() || self.allow_paths.iter().any(|rule| rule.matches(path))) && !self.exclude_paths.iter().any(|rule| rule.matches(path))
	}
}

#[derive(Clone, Debug)]
pub struct IsolatedCrawlGroup {
	pub parent: Url,
	pub child_path_prefix: String,
	pub group_path_segment_count: usize,
}

#[derive(Clone, Debug, Default)]
pub struct IsolatedCrawlGroups {
	pub routes: Vec<IsolatedCrawlGroup>,
	pub max_active_groups: usize,
	pub max_tabs_per_group: usize,
}

impl IsolatedCrawlGroups {
	pub fn max_worker_count(&self) -> usize {
		self.max_active_groups.saturating_mul(self.max_tabs_per_group)
	}

	pub fn group_for_child(&self, url: &Url) -> Option<&IsolatedCrawlGroup> {
		self.routes.iter().find(|group| group.matches_child(url))
	}
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CrawlQueue {
	Regular,
	Isolated,
}

impl IsolatedCrawlGroup {
	pub fn matches_child(&self, url: &Url) -> bool {
		let path_segment_count = url.path_segments().into_iter().flatten().filter(|segment| !segment.is_empty()).count();
		same_origin(&self.parent, url) && url.path().starts_with(&self.child_path_prefix) && path_segment_count > self.group_path_segment_count
	}

	pub fn is_descendant(&self, parent: &Url, child: &Url) -> bool {
		if !self.matches_child(parent) || !self.matches_child(child) || self.group_key(parent) != self.group_key(child) {
			return false;
		}

		let parent_segments = parent.path_segments().into_iter().flatten().collect::<Vec<_>>();
		let child_segments = child.path_segments().into_iter().flatten().collect::<Vec<_>>();
		child_segments.len() > parent_segments.len() && child_segments.starts_with(&parent_segments)
	}

	pub fn has_repeated_descendant_segment(&self, url: &Url) -> bool {
		let mut seen = HashSet::new();
		url.path_segments().into_iter().flatten().skip(self.group_path_segment_count).any(|segment| !seen.insert(segment))
	}

	fn group_url(&self, url: &Url) -> Url {
		let mut key_url = self.parent.clone();
		key_url.set_query(None);
		key_url.set_fragment(None);
		let path_segments = url.path_segments().map(|segments| segments.take(self.group_path_segment_count).collect::<Vec<_>>()).unwrap_or_default();
		key_url.set_path(&format!("/{}", path_segments.join("/")));
		key_url
	}

	pub fn group_key(&self, url: &Url) -> String {
		self.group_url(url).as_str().to_string()
	}

	pub fn group_url_for_visit(&self, child_url: &Url) -> Url {
		let mut group_url = self.group_url(child_url);
		group_url.set_query(child_url.query());
		group_url
	}

	pub fn parent_url_for_visit(&self, child_url: &Url) -> Url {
		let mut parent_url = self.parent.clone();
		parent_url.set_query(child_url.query());
		parent_url
	}
}

fn same_origin(left: &Url, right: &Url) -> bool {
	left.scheme() == right.scheme() && left.host_str() == right.host_str() && left.port_or_known_default() == right.port_or_known_default()
}

fn decrement_active_tab(active_tabs: &mut HashMap<String, usize>, group_key: &str) {
	let Some(active_count) = active_tabs.get_mut(group_key) else {
		return;
	};

	*active_count = active_count.saturating_sub(1);
	if *active_count == 0 {
		active_tabs.remove(group_key);
	}
}

struct VisitScheduler<'a> {
	frontier: &'a Frontier,
	isolated_crawl_groups: &'a IsolatedCrawlGroups,
}

impl<'a> VisitScheduler<'a> {
	fn next_available_url(&self, queue: CrawlQueue) -> Option<(&'a Url, Option<&'a IsolatedCrawlGroup>)> {
		self.frontier.to_visit.iter().find_map(|url| {
			let group = self.isolated_group_for_url(url);
			match (queue, group) {
				(CrawlQueue::Regular, None) => Some((url, None)),
				(CrawlQueue::Isolated, Some(group)) if self.group_available(group, url) => Some((url, Some(group))),
				_ => None,
			}
		})
	}

	fn work_units(&self, queue: CrawlQueue) -> usize {
		match queue {
			CrawlQueue::Regular => self.regular_work_units(),
			CrawlQueue::Isolated => self.isolated_work_units(),
		}
	}

	fn regular_work_units(&self) -> usize {
		self.frontier.to_visit.iter().chain(&self.frontier.visiting).filter(|url| self.isolated_group_for_url(url).is_none()).count()
	}

	fn isolated_work_units(&self) -> usize {
		let mut isolated_queued_counts = HashMap::<(usize, String), usize>::new();

		for url in &self.frontier.to_visit {
			if let Some((group_index, group)) = self.isolated_crawl_groups.routes.iter().enumerate().find(|(_, group)| group.matches_child(url)) {
				*isolated_queued_counts.entry((group_index, group.group_key(url))).or_default() += 1;
			}
		}

		let mut work_units = self.frontier.isolated_active_tabs.values().sum::<usize>();
		let mut active_group_count = self.frontier.isolated_active_groups.len();
		for ((_, group_key), queued_count) in isolated_queued_counts {
			if !self.group_is_active(&group_key) {
				if active_group_count >= self.isolated_crawl_groups.max_active_groups {
					continue;
				}
				active_group_count += 1;
			}

			work_units += self.group_work_units(queued_count, &group_key);
		}

		work_units
	}

	fn group_available(&self, group: &IsolatedCrawlGroup, url: &Url) -> bool {
		let group_key = group.group_key(url);
		if self.frontier.isolated_active_tabs.get(&group_key).copied().unwrap_or_default() >= self.isolated_crawl_groups.max_tabs_per_group {
			return false;
		}

		self.group_is_active(&group_key) || self.frontier.isolated_active_groups.len() < self.isolated_crawl_groups.max_active_groups
	}

	fn group_is_active(&self, group_key: &str) -> bool {
		self.frontier.isolated_active_groups.contains(group_key)
	}

	fn isolated_group_for_url(&self, url: &Url) -> Option<&'a IsolatedCrawlGroup> {
		self.isolated_crawl_groups.group_for_child(url)
	}

	fn group_work_units(&self, queued_count: usize, group_key: &str) -> usize {
		let active_count = self.frontier.isolated_active_tabs.get(group_key).copied().unwrap_or_default();
		queued_count.min(self.isolated_crawl_groups.max_tabs_per_group.saturating_sub(active_count))
	}
}

/// Tracks URLs through the crawler lifecycle.
///
/// - **to_visit:** URLs discovered but not yet assigned to a crawler.
/// - **visiting:** URLs currently being processed (loaded, expanded, and baked).
/// - **visited:** URLs successfully processed, all links and buttons extracted and queued for future visits.
#[derive(Default)]
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
	/// In-memory tab count for each active isolated child group.
	pub(crate) isolated_active_tabs: HashMap<String, usize>,
	/// In-memory isolated child groups currently allowed to receive work.
	pub(crate) isolated_active_groups: HashSet<String>,
}

impl Frontier {
	pub fn seen_any(&self, normalized_url: &Url) -> bool {
		self.to_visit.contains(normalized_url) || self.visiting.contains(normalized_url) || self.visited.contains(normalized_url) || self.failures.contains_key(normalized_url)
	}

	pub fn is_drained(&self) -> bool {
		self.to_visit.is_empty() && self.visiting.is_empty()
	}

	pub fn is_empty(&self) -> bool {
		self.to_visit.is_empty() && self.visiting.is_empty() && self.visited.is_empty() && self.visited_outputs.is_empty() && self.failures.is_empty() && self.isolated_active_tabs.is_empty() && self.isolated_active_groups.is_empty()
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

pub struct GlobalVisitState {
	/// Global visit policy used to decide which URLs are allowed.
	visit_policy: VisitPolicy,
	frontier: Mutex<Frontier>,
	// all snapshot writes happen while the frontier lock is held.
	state_store: Option<CrawlStateStore>,
	max_retries: usize,
}

impl GlobalVisitState {
	pub fn with_state_store(visit_policy: VisitPolicy, frontier: Frontier, state_store: CrawlStateStore, max_retries: usize) -> Self {
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
		Ok(self.add_many_to_visit_reserving_first(urls, [])?.0)
	}

	pub fn force_revisit_many<I>(&self, urls: I) -> anyhow::Result<Vec<Url>>
	where
		I: IntoIterator<Item = Url>,
	{
		let mut frontier = self.frontier.lock().unwrap();
		let mut changes = Vec::new();

		for url in urls {
			let normalized_url = Self::normalize_url(&url);
			if !self.visit_policy.allow(&normalized_url) || frontier.to_visit.contains(&normalized_url) || frontier.visiting.contains(&normalized_url) {
				continue;
			}

			let was_visited = frontier.visited.remove(&normalized_url);
			let previous_output = frontier.visited_outputs.remove(&normalized_url);
			let previous_failure = frontier.failures.remove(&normalized_url);
			frontier.to_visit.insert(normalized_url.clone());
			changes.push((normalized_url, was_visited, previous_output, previous_failure));
		}

		if !changes.is_empty()
			&& let Err(err) = self.save_frontier(&frontier)
		{
			for (url, was_visited, previous_output, previous_failure) in &changes {
				frontier.to_visit.remove(url);
				if *was_visited {
					frontier.visited.insert(url.clone());
				}
				if let Some(output_path) = previous_output {
					frontier.visited_outputs.insert(url.clone(), output_path.clone());
				}
				if let Some(failure) = previous_failure {
					frontier.failures.insert(url.clone(), failure.clone());
				}
			}
			return Err(err).context("save forced revisit URL state");
		}

		Ok(changes.into_iter().map(|(url, _, _, _)| url).collect())
	}

	pub fn add_many_to_visit_reserving_first<I, P>(&self, urls: I, preferred_urls: P) -> anyhow::Result<(Vec<Url>, Option<Url>)>
	where
		I: IntoIterator<Item = Url>,
		P: IntoIterator<Item = Url>,
	{
		let mut frontier = self.frontier.lock().unwrap();
		let mut added_urls = Vec::new();

		for url in urls {
			let normalized_url = Self::normalize_url(&url);
			if !frontier.seen_any(&normalized_url) && self.visit_policy.allow(&normalized_url) {
				frontier.to_visit.insert(normalized_url.clone());
				added_urls.push(normalized_url);
			}
		}

		let reserved_url = preferred_urls.into_iter().map(|url| Self::normalize_url(&url)).find(|url| {
			if !frontier.to_visit.remove(url) {
				return false;
			}
			frontier.visiting.insert(url.clone());
			true
		});

		if (!added_urls.is_empty() || reserved_url.is_some())
			&& let Err(err) = self.save_frontier(&frontier)
		{
			if let Some(url) = &reserved_url {
				frontier.visiting.remove(url);
				frontier.to_visit.insert(url.clone());
			}
			for url in &added_urls {
				frontier.to_visit.remove(url);
			}
			return Err(err).context("save queued and reserved URL state");
		}

		Ok((added_urls, reserved_url.as_ref().map(|url| self.url_for_visit(url))))
	}

	fn save_frontier(&self, frontier: &Frontier) -> anyhow::Result<()> {
		if let Some(state_store) = &self.state_store {
			state_store.save_frontier(frontier)?;
		}
		Ok(())
	}

	pub fn take_to_visit_from(&self, queue: CrawlQueue, isolated_crawl_groups: &IsolatedCrawlGroups) -> anyhow::Result<VisitQueueState> {
		let mut frontier = self.frontier.lock().unwrap();
		let scheduler = VisitScheduler { frontier: &frontier, isolated_crawl_groups };
		if let Some((url, isolated_group_key)) = scheduler.next_available_url(queue).map(|(url, group)| (url.clone(), group.map(|group| group.group_key(url)))) {
			frontier.to_visit.remove(&url);
			frontier.visiting.insert(url.clone());
			if let Some(group_key) = &isolated_group_key {
				*frontier.isolated_active_tabs.entry(group_key.clone()).or_default() += 1;
			}
			if let Err(err) = self.save_frontier(&frontier) {
				frontier.visiting.remove(&url);
				frontier.to_visit.insert(url.clone());
				if let Some(group_key) = &isolated_group_key {
					decrement_active_tab(&mut frontier.isolated_active_tabs, group_key);
				}
				return Err(err).with_context(|| format!("save started URL {url}"));
			}
			if let Some(group_key) = isolated_group_key {
				frontier.isolated_active_groups.insert(group_key);
			}

			Ok(VisitQueueState::Ready(self.url_for_visit(&url)))
		} else if frontier.is_drained() {
			Ok(VisitQueueState::Done)
		} else {
			Ok(VisitQueueState::Waiting)
		}
	}

	pub fn release_reserved_visit(&self, url: &Url) -> anyhow::Result<()> {
		let normalized_url = Self::normalize_url(url);
		let mut frontier = self.frontier.lock().unwrap();
		if !frontier.visiting.remove(&normalized_url) {
			return Ok(());
		}

		frontier.to_visit.insert(normalized_url.clone());
		if let Err(err) = self.save_frontier(&frontier) {
			frontier.to_visit.remove(&normalized_url);
			frontier.visiting.insert(normalized_url);
			return Err(err).context("save released URL state");
		}

		Ok(())
	}

	pub fn release_isolated_tab(&self, group: &IsolatedCrawlGroup, group_key: &str) {
		let mut frontier = self.frontier.lock().unwrap();
		decrement_active_tab(&mut frontier.isolated_active_tabs, group_key);
		if frontier.isolated_active_tabs.contains_key(group_key) || frontier.to_visit.iter().chain(&frontier.visiting).any(|url| group.matches_child(url) && group.group_key(url) == group_key) {
			return;
		}

		frontier.isolated_active_groups.remove(group_key);
	}

	fn url_for_visit(&self, url: &Url) -> Url {
		let mut url = url.clone();
		if !self.visit_policy.query_params.is_empty() {
			let mut query_pairs = url.query_pairs_mut();
			for (key, value) in &self.visit_policy.query_params {
				query_pairs.append_pair(key, value);
			}
		}
		url
	}

	pub fn is_done(&self) -> bool {
		let frontier = self.frontier.lock().unwrap();
		frontier.is_drained()
	}

	pub fn work_units(&self, queue: CrawlQueue, isolated_crawl_groups: &IsolatedCrawlGroups) -> usize {
		let frontier = self.frontier.lock().unwrap();
		VisitScheduler { frontier: &frontier, isolated_crawl_groups }.work_units(queue)
	}

	pub fn is_empty(&self) -> bool {
		let frontier = self.frontier.lock().unwrap();
		frontier.is_empty()
	}

	pub fn re_add_failed_visit(&self, url: Url, error: &str) -> anyhow::Result<FailedVisitAction> {
		let normalized_url = Self::normalize_url(&url);
		let mut frontier = self.frontier.lock().unwrap();
		if !frontier.visiting.remove(&normalized_url) {
			return Ok(FailedVisitAction::Ignored);
		}

		let had_to_visit = frontier.to_visit.contains(&normalized_url);
		let previous_failure = frontier.failures.get(&normalized_url).cloned();
		let failure = frontier.failures.entry(normalized_url.clone()).or_default();
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

		Ok(action)
	}

	pub fn mark_visited(&self, url: Url, output_path: &Path) -> anyhow::Result<()> {
		let normalized_url = Self::normalize_url(&url);
		let mut frontier = self.frontier.lock().unwrap();
		if !frontier.visiting.remove(&normalized_url) {
			return Ok(());
		}

		let previous_failure = frontier.failures.remove(&normalized_url);
		let was_visited = frontier.visited.contains(&normalized_url);
		let previous_output = frontier.visited_outputs.insert(normalized_url.clone(), output_path.to_path_buf());
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

	fn test_state(policy: VisitPolicy, max_retries: usize) -> GlobalVisitState {
		GlobalVisitState { visit_policy: policy, frontier: Mutex::new(Frontier::default()), state_store: None, max_retries }
	}

	fn take(state: &GlobalVisitState, queue: CrawlQueue, groups: &IsolatedCrawlGroups) -> Url {
		match state.take_to_visit_from(queue, groups).unwrap() {
			VisitQueueState::Ready(url) => url,
			other => panic!("expected ready URL, got {other:?}"),
		}
	}

	#[test]
	fn queue_normalizes_retries_and_refreshes_pages() {
		let root = Url::parse("https://debatemap.app").unwrap();
		let policy = VisitPolicy::new(root.clone(), vec![PathRule::StartsWith("/database".into())], vec![PathRule::Contains("private".into())], vec![("db".into(), "prod".into())]);
		let state = test_state(policy, 2);
		let groups = IsolatedCrawlGroups::default();
		let page = root.join("/database/item?old=1#fragment").unwrap();
		let normalized = root.join("/database/item").unwrap();

		assert!(!state.add_to_visit(root.join("/database/private").unwrap()).unwrap());
		assert!(!state.add_to_visit(Url::parse("https://other.test/database/item").unwrap()).unwrap());
		assert!(state.add_to_visit(page.clone()).unwrap());
		assert!(!state.add_to_visit(normalized.clone()).unwrap());

		let first = take(&state, CrawlQueue::Regular, &groups);
		assert_eq!(first.query(), Some("db=prod"));
		assert_eq!(state.re_add_failed_visit(first, "temporary").unwrap(), FailedVisitAction::Requeued { attempts: 1, max_retries: 2 });
		let second = take(&state, CrawlQueue::Regular, &groups);
		assert_eq!(state.re_add_failed_visit(second, "permanent").unwrap(), FailedVisitAction::Exhausted { attempts: 2, max_retries: 2 });
		assert_eq!(state.force_revisit_many([page.clone()]).unwrap(), vec![normalized.clone()]);

		let retry = take(&state, CrawlQueue::Regular, &groups);
		state.mark_visited(retry, Path::new("database/item/index.html")).unwrap();
		assert!(state.failed_visits().is_empty());
		assert_eq!(state.force_revisit_many([page]).unwrap(), vec![normalized]);
		let refreshed = take(&state, CrawlQueue::Regular, &groups);
		state.mark_visited(refreshed, Path::new("database/item/index.html")).unwrap();
		assert!(matches!(state.take_to_visit_from(CrawlQueue::Regular, &groups).unwrap(), VisitQueueState::Done));
	}

	#[test]
	fn isolated_scheduler_reserves_children_and_limits_groups() {
		let root = Url::parse("https://debatemap.app").unwrap();
		let group = IsolatedCrawlGroup { parent: root.join("/debates").unwrap(), child_path_prefix: "/debates/".into(), group_path_segment_count: 2 };
		let groups = IsolatedCrawlGroups { routes: vec![group.clone()], max_active_groups: 1, max_tabs_per_group: 2 };
		let state = test_state(VisitPolicy::new(root.clone(), vec![], vec![], vec![]), DEFAULT_MAX_RETRIES);
		let first_url = root.join("/debates/map-a/first").unwrap();
		let reserved_url = root.join("/debates/map-a/reserved").unwrap();
		let second_url = root.join("/debates/map-a/second").unwrap();
		let other_group = root.join("/debates/map-b/first").unwrap();

		state.add_many_to_visit([first_url, root.join("/database").unwrap()]).unwrap();
		let regular = take(&state, CrawlQueue::Regular, &groups);
		state.mark_visited(regular, Path::new("database/index.html")).unwrap();
		let first = take(&state, CrawlQueue::Isolated, &groups);
		let (_, reserved) = state.add_many_to_visit_reserving_first([reserved_url.clone(), second_url], [reserved_url.clone()]).unwrap();
		assert_eq!(reserved, Some(reserved_url.clone()));
		let second = take(&state, CrawlQueue::Isolated, &groups);
		assert_eq!(group.group_key(&first), group.group_key(&second));

		state.add_to_visit(other_group.clone()).unwrap();
		assert!(matches!(state.take_to_visit_from(CrawlQueue::Isolated, &groups).unwrap(), VisitQueueState::Waiting));
		for url in [first, reserved_url, second] {
			state.mark_visited(url, Path::new("map/index.html")).unwrap();
		}
		let group_key = group.group_key(&root.join("/debates/map-a/first").unwrap());
		state.release_isolated_tab(&group, &group_key);
		state.release_isolated_tab(&group, &group_key);
		assert_eq!(take(&state, CrawlQueue::Isolated, &groups), other_group);
		assert!(group.has_repeated_descendant_segment(&root.join("/debates/map-a/a/b/a").unwrap()));
	}
}
