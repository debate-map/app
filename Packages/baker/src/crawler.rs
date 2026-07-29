use crate::page;
use crate::page_baker::PageBaker;
use crate::visit::{CrawlQueue, FailedVisitAction, GlobalVisitState, IsolatedCrawlGroup, IsolatedCrawlGroups, VisitQueueState};
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
	isolated_crawl_groups: IsolatedCrawlGroups,
	queue: CrawlQueue,
	loaded_isolated_group: Mutex<Option<String>>,
}

impl CrawlerTab {
	pub fn new(tab: Arc<Tab>, visit_state: Arc<GlobalVisitState>, base_output_dir: PathBuf, isolated_crawl_groups: IsolatedCrawlGroups, queue: CrawlQueue) -> Self {
		CrawlerTab { tab, visit_state, page_baker: PageBaker::new(base_output_dir), isolated_crawl_groups, queue, loaded_isolated_group: Mutex::new(None) }
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
		if let Some(group) = self.isolated_crawl_groups.group_for_child(url).cloned() {
			self.ensure_isolated_group_loaded(&group, url)?;
			if group.group_url_for_visit(url) == *url {
				return Ok(());
			}
			info!("Rendering {} through isolated group {}", url.as_str(), group.group_key(url));
			page::switch_isolated_route(&self.tab, url).with_context(|| format!("switch SPA route to {}", url.as_str()))?;
			return Ok(());
		}

		*self.loaded_isolated_group.lock().unwrap() = None;
		self.navigate_wait_and_prepare(url)?;
		Ok(())
	}

	fn ensure_isolated_group_loaded(&self, group: &IsolatedCrawlGroup, child_url: &Url) -> anyhow::Result<()> {
		let group_key = group.group_key(child_url);
		if self.loaded_isolated_group.lock().unwrap().as_ref() == Some(&group_key) {
			return Ok(());
		}

		*self.loaded_isolated_group.lock().unwrap() = None;
		let parent_url = group.parent_url_for_visit(child_url);
		let group_url = group.group_url_for_visit(child_url);
		info!("Loading isolated parent {} before group {}", parent_url.as_str(), group_url.as_str());
		self.navigate_wait_and_prepare(&parent_url)?;
		if group_url != parent_url {
			page::switch_isolated_route(&self.tab, &group_url).with_context(|| format!("initialize isolated group {}", group_url.as_str()))?;
		}
		*self.loaded_isolated_group.lock().unwrap() = Some(group_key);

		Ok(())
	}

	fn record_discovered_links(&self, url: &Url, mut links: Vec<Url>, branch: Option<&IsolatedCrawlGroup>) -> anyhow::Result<Option<Url>> {
		let extracted_count = links.len();
		links.retain(|link| self.isolated_crawl_groups.group_for_child(link).is_none_or(|group| !group.has_repeated_descendant_segment(link)));
		let cyclic_count = extracted_count - links.len();
		if cyclic_count > 0 {
			warn!("Skipped {} cyclic isolated link(s) from {}", cyclic_count, url.as_str());
		}

		let preferred_urls = branch.into_iter().flat_map(|group| links.iter().filter(|link| group.is_descendant(url, link)).cloned()).collect::<Vec<_>>();
		let (queued_urls, reserved_url) = self.visit_state.add_many_to_visit_reserving_first(links, preferred_urls).with_context(|| format!("record discovered links from {}", url.as_str()))?;
		let isolated_count = queued_urls.iter().filter(|url| self.isolated_crawl_groups.group_for_child(url).is_some()).count();
		let regular_count = queued_urls.len() - isolated_count;
		if regular_count > 0 {
			info!("Discovered {} regular link(s) from {}", regular_count, url.as_str());
		}
		if isolated_count > 0 {
			info!("Queued {} isolated child link(s) from {}", isolated_count, url.as_str());
		}

		Ok(reserved_url)
	}

	fn extract_link_urls(&self, url: &Url) -> anyhow::Result<Vec<Url>> {
		Ok(page::extract_links(&self.tab).with_context(|| format!("extract links from {}", url.as_str()))?.into_iter().filter_map(|link| Url::parse(&link).ok()).collect())
	}

	fn process_url(&self, url: Url) {
		if let Some(group) = self.isolated_crawl_groups.group_for_child(&url).cloned() {
			let group_key = group.group_key(&url);
			self.process_isolated_group(url, &group);
			self.visit_state.release_isolated_tab(&group, &group_key);
		} else if let Err(err) = self.process_and_bake(&url, None) {
			self.record_failure(url, err);
		}
	}

	fn process_isolated_group(&self, first_url: Url, group: &IsolatedCrawlGroup) {
		let mut next_url = Some(first_url);
		while let Some(url) = next_url {
			info!("Processing isolated child route {} under {}", url.as_str(), group.parent.as_str());
			match self.process_and_bake(&url, Some(group)) {
				Ok(reserved_child) => next_url = reserved_child,
				Err(err) => {
					self.record_failure(url, err);
					next_url = None;
				},
			}
		}
	}

	fn process_and_bake(&self, url: &Url, branch: Option<&IsolatedCrawlGroup>) -> anyhow::Result<Option<Url>> {
		self.render_url(url)?;

		let link_urls = self.extract_link_urls(url)?;
		let reserved_child = self.record_discovered_links(url, link_urls, branch)?;

		info!("All links extracted from {}, marking it as visited", url.as_str());
		if let Err(err) = self.mark_visited(url.clone()) {
			if let Some(child) = &reserved_child {
				self.visit_state.release_reserved_visit(child).with_context(|| format!("release reserved child {}", child.as_str()))?;
			}
			return Err(err).with_context(|| format!("mark {} as visited", url.as_str()));
		}

		Ok(reserved_child)
	}

	fn record_failure(&self, url: Url, err: anyhow::Error) {
		let error = format!("{err:#}");
		error!("{error}");
		match self.visit_state.re_add_failed_visit(url.clone(), &error) {
			Ok(FailedVisitAction::Requeued { attempts, max_retries }) => warn!("Requeued failed page {} after attempt {}/{}", url.as_str(), attempts, max_retries),
			Ok(FailedVisitAction::Exhausted { attempts, max_retries }) => error!("Skipping failed page {} after attempt {}/{}", url.as_str(), attempts, max_retries),
			Ok(FailedVisitAction::Ignored) => {},
			Err(err) => error!("Failed to record failed page {}: {err}", url.as_str()),
		}
	}

	pub fn run(&self, worker_id: usize, should_retire: Arc<AtomicBool>) {
		loop {
			if should_retire.load(Ordering::Relaxed) {
				info!("{:?} crawler worker {worker_id} retiring", self.queue);
				break;
			}

			match self.visit_state.take_to_visit_from(self.queue, &self.isolated_crawl_groups) {
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

		info!("{:?} crawler worker {worker_id} stopped", self.queue);
	}
}
