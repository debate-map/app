use crate::page;
use crate::page_baker::PageBaker;
use crate::visit::{FailedVisitAction, GlobalVisitState, SamePageRouteGroup, VisitQueueState};
use anyhow::{Context, bail};
use headless_chrome::Tab;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread::JoinHandle;
use std::thread::sleep;
use std::time::Duration;
use tracing::{error, info, warn};
use url::Url;

pub struct CrawlerTab {
	/// The browser tab that will be used for crawling
	tab: Arc<Tab>,
	visit_state: Arc<GlobalVisitState>,
	page_baker: PageBaker,
	same_page_route_groups: Vec<SamePageRouteGroup>,
	loaded_same_page_parent: Mutex<Option<Url>>,
}

impl CrawlerTab {
	pub fn new(tab: Arc<Tab>, visit_state: Arc<GlobalVisitState>, base_output_dir: PathBuf, same_page_route_groups: Vec<SamePageRouteGroup>) -> Self {
		CrawlerTab { tab, visit_state, page_baker: PageBaker::new(base_output_dir), same_page_route_groups, loaded_same_page_parent: Mutex::new(None) }
	}

	pub fn spawn_thread_and_run(self: Arc<Self>, worker_id: usize, should_retire: Arc<AtomicBool>) -> JoinHandle<()> {
		std::thread::spawn(move || {
			self.run(worker_id, should_retire);
		})
	}

	pub fn close_tab(&self) {
		if let Err(err) = self.tab.close(false) {
			warn!("Failed to close crawler tab: {err}");
		}
	}

	fn mark_visited(&self, url: Url) -> anyhow::Result<()> {
		let output_path = self.page_baker.bake_tab(self.tab.as_ref(), &url)?;
		self.visit_state.mark_visited(url, &output_path)?;

		Ok(())
	}

	fn navigate_wait_and_prepare(&self, url: &Url) -> anyhow::Result<()> {
		if let Err(err) = self.tab.navigate_to(url.as_str()) {
			sleep(Duration::from_secs(1));
			bail!("Failed to navigate to {}: {err}", url.as_str());
		}

		if let Err(err) = page::wait_until_ready(&self.tab, url) {
			sleep(Duration::from_secs(1));
			bail!("Navigation wait failed for {}: {err}", url.as_str());
		}

		Ok(())
	}

	fn render_url(&self, url: &Url) -> anyhow::Result<()> {
		if let Some(group) = self.same_page_group_for_child(url).cloned() {
			self.ensure_same_page_parent_loaded(&group, url)?;
			info!("Rendering {} through same-page parent {}", url.as_str(), group.parent.as_str());
			page::switch_same_page_route(&self.tab, url).with_context(|| format!("switch SPA route to {}", url.as_str()))?;
			return Ok(());
		}

		{
			let mut loaded_parent = self.loaded_same_page_parent.lock().unwrap();
			*loaded_parent = None;
		}

		self.navigate_wait_and_prepare(url)?;

		if let Some(group) = self.same_page_group_for_parent(url) {
			let mut loaded_parent = self.loaded_same_page_parent.lock().unwrap();
			*loaded_parent = Some(group.parent.clone());
		}

		Ok(())
	}

	fn ensure_same_page_parent_loaded(&self, group: &SamePageRouteGroup, child_url: &Url) -> anyhow::Result<()> {
		let parent_is_loaded = self.loaded_same_page_parent.lock().unwrap().as_ref() == Some(&group.parent);
		if parent_is_loaded {
			return Ok(());
		}

		{
			let mut loaded_parent = self.loaded_same_page_parent.lock().unwrap();
			*loaded_parent = None;
		}

		let parent_url = group.parent_url_for_visit(child_url);
		info!("Loading same-page parent {} before child {}", parent_url.as_str(), child_url.as_str());
		self.navigate_wait_and_prepare(&parent_url)?;

		let mut loaded_parent = self.loaded_same_page_parent.lock().unwrap();
		*loaded_parent = Some(group.parent.clone());

		Ok(())
	}

	fn same_page_group_for_child(&self, url: &Url) -> Option<&SamePageRouteGroup> {
		self.same_page_route_groups.iter().find(|group| group.matches_child(url))
	}

	fn same_page_group_for_parent(&self, url: &Url) -> Option<&SamePageRouteGroup> {
		self.same_page_route_groups.iter().find(|group| group.matches_parent(url))
	}

	fn record_discovered_links(&self, url: &Url, links: Vec<Url>) -> anyhow::Result<()> {
		let Some(group) = self.same_page_group_for_parent(url) else {
			let recorded_links = self.visit_state.record_links(links, []).with_context(|| format!("record discovered links from {}", url.as_str()))?;
			if !recorded_links.queued_urls.is_empty() {
				info!("Discovered {} regular link(s) from {}", recorded_links.queued_urls.len(), url.as_str());
			}
			return Ok(());
		};

		let mut same_page_children = Vec::new();
		let mut regular_links = Vec::new();
		for link in links {
			if group.matches_child(&link) {
				same_page_children.push(link);
			} else {
				regular_links.push(link);
			}
		}

		let recorded_links = self.visit_state.record_links(regular_links.into_iter().chain(same_page_children), []).with_context(|| format!("record discovered links from {}", url.as_str()))?;
		let same_page_count = recorded_links.queued_urls.iter().filter(|url| group.matches_child(url)).count();
		let regular_count = recorded_links.queued_urls.len() - same_page_count;
		if regular_count > 0 {
			info!("Discovered {} regular link(s) from {}", regular_count, url.as_str());
		}
		if same_page_count > 0 {
			info!("Queued {} same-page child link(s) from {}", same_page_count, url.as_str());
		}

		Ok(())
	}

	fn extract_link_urls(&self, url: &Url) -> anyhow::Result<Vec<Url>> {
		Ok(page::extract_links(&self.tab).with_context(|| format!("extract links from {}", url.as_str()))?.into_iter().filter_map(|link| Url::parse(&link).ok()).collect())
	}

	fn process_url(&self, url: Url) {
		if let Some(group) = self.same_page_group_for_child(&url).cloned() {
			if let Err(err) = self.process_same_page_child_batch(url.clone(), &group) {
				error!("{err}");
				self.re_add_failed_visit(url, &err.to_string());
			}
			self.visit_state.release_same_page_batch(&group);
			return;
		}

		if let Err(err) = self.process_regular_url(url.clone()) {
			error!("{err}");
			self.re_add_failed_visit(url, &err.to_string());
		}
	}

	fn process_same_page_child_batch(&self, first_url: Url, group: &SamePageRouteGroup) -> anyhow::Result<()> {
		let mut batch_urls = vec![first_url];
		let mut sibling_urls = self.visit_state.reserve_matching_same_page_children(group, group.batch_size.saturating_sub(1)).with_context(|| format!("reserve queued same-page children for parent {}", group.parent.as_str()))?;
		batch_urls.append(&mut sibling_urls);

		info!("Processing {} same-page child route(s) under {} in one tab", batch_urls.len(), group.parent.as_str());

		for url in batch_urls {
			self.process_same_page_child_url(url);
		}

		Ok(())
	}

	fn process_same_page_child_url(&self, url: Url) {
		if let Err(err) = self.render_and_mark_visited(url.clone()) {
			error!("{err}");
			self.re_add_failed_visit(url, &err.to_string());
		}
	}

	fn process_regular_url(&self, url: Url) -> anyhow::Result<()> {
		self.render_url(&url)?;

		let link_urls = self.extract_link_urls(&url)?;
		self.record_discovered_links(&url, link_urls)?;

		info!("All links extracted from {}, marking it as visited", url.as_str());

		self.mark_visited(url.clone()).with_context(|| format!("mark {} as visited", url.as_str()))?;

		Ok(())
	}

	fn render_and_mark_visited(&self, url: Url) -> anyhow::Result<()> {
		self.render_url(&url)?;
		self.mark_visited(url.clone()).with_context(|| format!("mark {} as visited", url.as_str()))
	}

	fn re_add_failed_visit(&self, url: Url, error: &str) {
		match self.visit_state.re_add_failed_visit(url.clone(), error) {
			Ok(FailedVisitAction::Requeued { attempts, max_retries }) => warn!("Requeued failed page {} after attempt {}/{}", url.as_str(), attempts, max_retries),
			Ok(FailedVisitAction::Exhausted { attempts, max_retries }) => error!("Skipping failed page {} after attempt {}/{}", url.as_str(), attempts, max_retries),
			Ok(FailedVisitAction::Ignored) => {},
			Err(err) => error!("Failed to record failed page {}: {err}", url.as_str()),
		}
	}

	pub fn run(&self, worker_id: usize, should_retire: Arc<AtomicBool>) {
		loop {
			if should_retire.load(Ordering::Relaxed) {
				info!("Crawler worker {worker_id} retiring");
				break;
			}

			match self.visit_state.take_to_visit_with_groups(&self.same_page_route_groups) {
				Ok(VisitQueueState::Ready(url)) => self.process_url(url),
				Ok(VisitQueueState::Waiting) => {
					sleep(Duration::from_secs(1));
				},
				Ok(VisitQueueState::Done) => break,
				Err(err) => {
					error!("Failed to take URL from visit queue: {err}");
					sleep(Duration::from_secs(1));
				},
			}
		}

		info!("Crawler worker {worker_id} stopped");
	}
}
