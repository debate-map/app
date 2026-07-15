use crate::engine::CrawlerEngineConfig;
use crate::serve::PreviewServerConfig;
use crate::visit::{DEFAULT_MAX_RETRIES, IsolatedCrawlGroup, IsolatedCrawlGroups, PathRule, VisitPolicy};
use anyhow::{Context, bail};
use serde::Deserialize;
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use url::Url;

#[derive(Debug, Deserialize)]
pub struct BakerConfig {
	pub root_url: String,
	#[serde(default)]
	pub start_paths: Vec<String>,
	#[serde(default)]
	pub query_params: BTreeMap<String, String>,
	#[serde(default = "default_regular_crawler_count", alias = "crawler_count")]
	pub regular_crawler_count: usize,
	#[serde(default = "default_max_retries")]
	pub max_retries: usize,
	#[serde(default = "default_base_output_dir")]
	pub base_output_dir: PathBuf,
	#[serde(default)]
	pub serve: PreviewServerConfig,
	#[serde(default)]
	pub visit_policy: VisitPolicyConfig,
}

#[derive(Debug, Deserialize)]
pub struct IsolatedCrawlGroupConfig {
	pub parent: String,
	pub child_depth: usize,
}

#[derive(Debug, Default, Deserialize)]
pub struct IsolatedCrawlGroupsConfig {
	pub max_active_groups: usize,
	pub max_tabs_per_group: usize,
	#[serde(default)]
	pub routes: Vec<IsolatedCrawlGroupConfig>,
}

#[derive(Debug, Default, Deserialize)]
pub struct VisitPolicyConfig {
	#[serde(default)]
	pub allow_paths: Vec<PathRule>,
	#[serde(default)]
	pub exclude_paths: Vec<PathRule>,
	#[serde(default)]
	pub isolated_crawl_groups: IsolatedCrawlGroupsConfig,
}

#[derive(Debug, Deserialize)]
struct RuntimeConfigFile {
	#[serde(default = "default_regular_crawler_count", alias = "crawler_count")]
	regular_crawler_count: usize,
}

impl BakerConfig {
	pub fn load(path: impl AsRef<Path>) -> anyhow::Result<Self> {
		let path = path.as_ref();
		let contents = fs::read_to_string(path).with_context(|| format!("read {}", path.display()))?;
		serde_yaml::from_str(&contents).with_context(|| format!("parse {}", path.display()))
	}

	pub fn load_runtime(path: impl AsRef<Path>) -> anyhow::Result<usize> {
		let path = path.as_ref();
		let contents = fs::read_to_string(path).with_context(|| format!("read {}", path.display()))?;
		let runtime_config: RuntimeConfigFile = serde_yaml::from_str(&contents).with_context(|| format!("parse {}", path.display()))?;
		validate_positive("regular_crawler_count", runtime_config.regular_crawler_count)?;

		Ok(runtime_config.regular_crawler_count)
	}

	pub fn into_engine_config(self) -> anyhow::Result<CrawlerEngineConfig> {
		let root = Url::parse(&self.root_url).with_context(|| format!("parse root_url {}", self.root_url))?;
		validate_positive("regular_crawler_count", self.regular_crawler_count)?;
		validate_positive("max_retries", self.max_retries)?;

		let start_urls = Self::resolve_start_urls(&root, &self.start_paths)?;
		let VisitPolicyConfig { allow_paths, exclude_paths, isolated_crawl_groups } = self.visit_policy;
		let isolated_crawl_groups = isolated_crawl_groups.into_isolated_crawl_groups(&root)?;

		let visit_policy = VisitPolicy::new(root, allow_paths, exclude_paths, self.query_params.into_iter().collect());

		for start_url in &start_urls {
			if !visit_policy.allow(start_url) {
				bail!("start path {} is not allowed by visit_policy", start_url);
			}
		}

		for group in &isolated_crawl_groups.routes {
			if !visit_policy.allow(&group.parent) {
				bail!("isolated crawl parent {} is not allowed by visit_policy", group.parent);
			}
		}

		Ok(CrawlerEngineConfig {
			regular_crawler_count: self.regular_crawler_count,
			max_retries: self.max_retries,
			start_urls,
			visit_policy,
			isolated_crawl_groups,
			base_output_dir: self.base_output_dir,
			serve: self.serve,
		})
	}

	fn resolve_start_urls(root: &Url, start_paths: &[String]) -> anyhow::Result<Vec<Url>> {
		if start_paths.is_empty() {
			return Ok(vec![root.clone()]);
		}

		start_paths.iter().map(|path| root.join(path).with_context(|| format!("resolve start path {path} against root_url {root}"))).collect()
	}
}

impl IsolatedCrawlGroupConfig {
	fn into_isolated_crawl_group(self, root: &Url) -> anyhow::Result<IsolatedCrawlGroup> {
		let parent = root.join(&self.parent).with_context(|| format!("resolve isolated crawl parent {} against root_url {root}", self.parent))?;
		let parent_depth = parent.path_segments().map(|segments| segments.filter(|segment| !segment.is_empty()).count()).unwrap_or_default();
		let group_path_segment_count = parent_depth.checked_add(self.child_depth).context("isolated crawl child depth is too large")?;
		let child_path_prefix = format!("{}/", parent.path().trim_end_matches('/'));

		Ok(IsolatedCrawlGroup { parent, child_path_prefix, group_path_segment_count })
	}
}

impl IsolatedCrawlGroupsConfig {
	fn into_isolated_crawl_groups(self, root: &Url) -> anyhow::Result<IsolatedCrawlGroups> {
		if self.routes.is_empty() {
			return Ok(IsolatedCrawlGroups::default());
		}

		validate_positive("isolated_crawl_groups.max_active_groups", self.max_active_groups)?;
		validate_positive("isolated_crawl_groups.max_tabs_per_group", self.max_tabs_per_group)?;
		self.max_active_groups.checked_mul(self.max_tabs_per_group).context("isolated crawler capacity is too large")?;

		let routes = self.routes.into_iter().map(|group| group.into_isolated_crawl_group(root)).collect::<anyhow::Result<_>>()?;
		Ok(IsolatedCrawlGroups { routes, max_active_groups: self.max_active_groups, max_tabs_per_group: self.max_tabs_per_group })
	}
}

fn default_regular_crawler_count() -> usize {
	10
}

fn default_max_retries() -> usize {
	DEFAULT_MAX_RETRIES
}

fn default_base_output_dir() -> PathBuf {
	"./static".into()
}

fn validate_positive(name: &str, value: usize) -> anyhow::Result<()> {
	if value == 0 {
		bail!("{name} must be at least 1");
	}
	Ok(())
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn checked_in_configs_match_the_runtime_contract() {
		let standard: BakerConfig = serde_yaml::from_str(include_str!("../config.yaml")).unwrap();
		let standard = standard.into_engine_config().unwrap();
		assert_eq!(standard.start_urls.len(), 4);
		assert_eq!(standard.visit_policy.query_params.len(), 2);
		assert_eq!(standard.regular_crawler_count, 3);
		assert_eq!(standard.isolated_crawl_groups.routes.len(), 2);
		assert_eq!(standard.isolated_crawl_groups.max_active_groups, 3);
		assert_eq!(standard.isolated_crawl_groups.max_tabs_per_group, 4);
		assert_eq!(standard.isolated_crawl_groups.max_worker_count(), 12);
		assert_eq!(standard.isolated_crawl_groups.routes[0].group_path_segment_count, 2);
		assert_eq!(standard.max_retries, DEFAULT_MAX_RETRIES);
		assert!(standard.serve.enabled);

		let focused: BakerConfig = serde_yaml::from_str(include_str!("../config.how-old-universe.yaml")).unwrap();
		let focused = focused.into_engine_config().unwrap();
		assert_eq!(focused.regular_crawler_count, 1);
		assert_eq!(focused.start_urls, vec![Url::parse("http://localhost:5101/debates").unwrap()]);
		assert_eq!(focused.isolated_crawl_groups.routes[0].group_path_segment_count, 2);
		assert_eq!(focused.isolated_crawl_groups.max_worker_count(), 8);
		assert_eq!(focused.base_output_dir, PathBuf::from("./static-how-old-universe"));
	}
}
