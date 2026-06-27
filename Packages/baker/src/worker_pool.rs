use crate::browser::BrowserSession;
use crate::crawler::CrawlerTab;
use crate::visit::{GlobalVisitState, SamePageRouteGroup};
use std::path::Path;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread::JoinHandle;
use tracing::{error, info};

pub struct WorkerPool {
	workers: Vec<CrawlerWorker>,
	next_worker_id: usize,
}

impl WorkerPool {
	pub fn new() -> Self {
		Self { workers: Vec::new(), next_worker_id: 0 }
	}

	pub fn sync(&mut self, browser: &BrowserSession, visit_state: Arc<GlobalVisitState>, base_output_dir: &Path, same_page_route_groups: &[SamePageRouteGroup], max_worker_count: usize, queued_work_units: usize) -> anyhow::Result<()> {
		self.reap_finished_workers();

		let accepting_count = self.accepting_worker_count();
		if accepting_count > max_worker_count {
			self.retire_surplus_workers(accepting_count - max_worker_count);
			return Ok(());
		}

		let target_count = queued_work_units.min(max_worker_count).max(accepting_count);
		for _ in 0..(target_count - accepting_count) {
			self.spawn_worker(browser, visit_state.clone(), base_output_dir, same_page_route_groups)?;
		}

		Ok(())
	}

	pub fn stop_all(&mut self) {
		for worker in &self.workers {
			worker.request_retire();
		}

		while let Some(worker) = self.workers.pop() {
			worker.join_and_close();
		}
	}

	fn accepting_worker_count(&self) -> usize {
		self.workers.iter().filter(|worker| worker.accepts_new_work()).count()
	}

	fn spawn_worker(&mut self, browser: &BrowserSession, visit_state: Arc<GlobalVisitState>, base_output_dir: &Path, same_page_route_groups: &[SamePageRouteGroup]) -> anyhow::Result<()> {
		let id = self.next_worker_id;
		self.next_worker_id += 1;

		let crawler_tab = Arc::new(CrawlerTab::new(browser.new_tab()?, visit_state, base_output_dir.to_path_buf(), same_page_route_groups.to_vec()));
		self.workers.push(CrawlerWorker::start(id, crawler_tab));
		info!("Started crawler worker {id}");

		Ok(())
	}

	fn retire_surplus_workers(&self, surplus_count: usize) {
		let mut remaining = surplus_count;
		for worker in self.workers.iter().rev() {
			if remaining == 0 {
				break;
			}

			if worker.accepts_new_work() {
				worker.request_retire();
				remaining -= 1;
				info!("Asked crawler worker {} to retire", worker.id);
			}
		}
	}

	fn reap_finished_workers(&mut self) {
		let mut index = 0;
		while index < self.workers.len() {
			if self.workers[index].is_finished() {
				let worker = self.workers.swap_remove(index);
				worker.join_and_close();
			} else {
				index += 1;
			}
		}
	}
}

impl Default for WorkerPool {
	fn default() -> Self {
		Self::new()
	}
}

struct CrawlerWorker {
	id: usize,
	crawler_tab: Arc<CrawlerTab>,
	should_retire: Arc<AtomicBool>,
	handle: JoinHandle<()>,
}

impl CrawlerWorker {
	fn start(id: usize, crawler_tab: Arc<CrawlerTab>) -> Self {
		let should_retire = Arc::new(AtomicBool::new(false));
		let handle = crawler_tab.clone().spawn_thread_and_run(id, should_retire.clone());

		Self { id, crawler_tab, should_retire, handle }
	}

	fn request_retire(&self) {
		self.should_retire.store(true, Ordering::Relaxed);
	}

	fn accepts_new_work(&self) -> bool {
		!self.should_retire.load(Ordering::Relaxed) && !self.handle.is_finished()
	}

	fn is_finished(&self) -> bool {
		self.handle.is_finished()
	}

	fn join_and_close(self) {
		let id = self.id;
		if self.handle.join().is_err() {
			error!("Crawler worker {id} panicked");
		}

		self.crawler_tab.close_tab();
		info!("Closed crawler worker {id} tab");
	}
}
