use crate::engine::CrawlerEngineConfig;
use crate::serve::PreviewServerConfig;
use crate::visit::{DEFAULT_MAX_RETRIES, DEFAULT_SAME_PAGE_BATCH_SIZE, DEFAULT_SAME_PAGE_MAX_TABS, PathRule, SamePageRouteGroup, VisitPolicy};
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
	#[serde(default = "default_crawler_count")]
	pub crawler_count: usize,
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
pub struct PathRuleConfig {
	pub kind: PathRuleKind,
	pub value: String,
}

#[derive(Debug, Deserialize)]
pub struct SamePageRouteGroupConfig {
	pub parent: String,
	#[serde(default = "default_same_page_max_tabs")]
	pub max_tabs: usize,
	#[serde(default = "default_same_page_batch_size")]
	pub batch_size: usize,
	#[serde(default)]
	pub lane_path_segment_count: Option<usize>,
	#[serde(default)]
	pub child_paths: Vec<PathRuleConfig>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PathRuleKind {
	StartsWith,
	Contains,
	EndsWith,
	Exact,
}

#[derive(Debug, Default, Deserialize)]
pub struct VisitPolicyConfig {
	#[serde(default)]
	pub query_params: BTreeMap<String, String>,
	#[serde(default)]
	pub allow_paths: Vec<PathRuleConfig>,
	#[serde(default)]
	pub exclude_paths: Vec<PathRuleConfig>,
	#[serde(default)]
	pub same_page_route_groups: Vec<SamePageRouteGroupConfig>,
}

#[derive(Debug, Clone, Copy)]
pub struct CrawlerRuntimeConfig {
	pub crawler_count: usize,
}

#[derive(Debug, Deserialize)]
struct RuntimeConfigFile {
	#[serde(default = "default_crawler_count")]
	crawler_count: usize,
}

impl BakerConfig {
	pub fn load(path: impl AsRef<Path>) -> anyhow::Result<Self> {
		let path = path.as_ref();
		let contents = fs::read_to_string(path).with_context(|| format!("read {}", path.display()))?;
		serde_yaml::from_str(&contents).with_context(|| format!("parse {}", path.display()))
	}

	pub fn load_runtime(path: impl AsRef<Path>) -> anyhow::Result<CrawlerRuntimeConfig> {
		let path = path.as_ref();
		let contents = fs::read_to_string(path).with_context(|| format!("read {}", path.display()))?;
		let runtime_config: RuntimeConfigFile = serde_yaml::from_str(&contents).with_context(|| format!("parse {}", path.display()))?;
		validate_positive("crawler_count", runtime_config.crawler_count)?;

		Ok(CrawlerRuntimeConfig { crawler_count: runtime_config.crawler_count })
	}

	pub fn into_engine_config(self) -> anyhow::Result<CrawlerEngineConfig> {
		let root = Url::parse(&self.root_url).with_context(|| format!("parse root_url {}", self.root_url))?;
		validate_positive("crawler_count", self.crawler_count)?;
		validate_positive("max_retries", self.max_retries)?;

		let start_urls = Self::resolve_start_urls(&root, &self.start_paths)?;

		let allow_paths = self.visit_policy.allow_paths.into_iter().map(PathRuleConfig::into_path_rule).collect();

		let exclude_paths = self.visit_policy.exclude_paths.into_iter().map(PathRuleConfig::into_path_rule).collect();

		let same_page_route_groups = self.visit_policy.same_page_route_groups.into_iter().map(|group| group.into_same_page_route_group(&root)).collect::<anyhow::Result<Vec<_>>>()?;

		let visit_policy = VisitPolicy::new(root, allow_paths, exclude_paths, self.visit_policy.query_params.into_iter().collect());

		for start_url in &start_urls {
			if !visit_policy.allow(start_url) {
				bail!("start path {} is not allowed by visit_policy", start_url);
			}
		}

		for group in &same_page_route_groups {
			if !visit_policy.allow(&group.parent) {
				bail!("same-page route parent {} is not allowed by visit_policy", group.parent);
			}
		}

		Ok(CrawlerEngineConfig {
			crawler_count: self.crawler_count,
			max_retries: self.max_retries,
			start_urls,
			visit_policy,
			same_page_route_groups,
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

impl PathRuleConfig {
	fn into_path_rule(self) -> PathRule {
		match self.kind {
			PathRuleKind::StartsWith => PathRule::StartsWith(self.value),
			PathRuleKind::Contains => PathRule::Contains(self.value),
			PathRuleKind::EndsWith => PathRule::EndsWith(self.value),
			PathRuleKind::Exact => PathRule::Exact(self.value),
		}
	}
}

impl SamePageRouteGroupConfig {
	fn into_same_page_route_group(self, root: &Url) -> anyhow::Result<SamePageRouteGroup> {
		validate_positive("same_page_route_groups.max_tabs", self.max_tabs)?;
		validate_positive("same_page_route_groups.batch_size", self.batch_size)?;
		if let Some(lane_path_segment_count) = self.lane_path_segment_count {
			validate_positive("same_page_route_groups.lane_path_segment_count", lane_path_segment_count)?;
		}

		if self.child_paths.is_empty() {
			bail!("same-page route group for parent {} must define at least one child path rule", self.parent);
		}

		let parent = root.join(&self.parent).with_context(|| format!("resolve same-page parent {} against root_url {root}", self.parent))?;
		let child_paths = self.child_paths.into_iter().map(PathRuleConfig::into_path_rule).collect();

		Ok(SamePageRouteGroup { parent, child_paths, max_tabs: self.max_tabs, batch_size: self.batch_size, lane_path_segment_count: self.lane_path_segment_count })
	}
}

fn default_crawler_count() -> usize {
	10
}

fn default_max_retries() -> usize {
	DEFAULT_MAX_RETRIES
}

fn default_base_output_dir() -> PathBuf {
	"./static".into()
}

fn default_same_page_max_tabs() -> usize {
	DEFAULT_SAME_PAGE_MAX_TABS
}

fn default_same_page_batch_size() -> usize {
	DEFAULT_SAME_PAGE_BATCH_SIZE
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
	fn checked_in_config_matches_schema() {
		let config: BakerConfig = serde_yaml::from_str(include_str!("../config.yaml")).unwrap();
		let engine_config = config.into_engine_config().unwrap();

		assert_eq!(engine_config.visit_policy.root.as_str(), "http://localhost:5101/");
		assert_eq!(engine_config.start_urls.len(), 4);
		assert_eq!(engine_config.start_urls[0].as_str(), "http://localhost:5101/database");
		assert_eq!(engine_config.start_urls[1].as_str(), "http://localhost:5101/database/users");
		assert_eq!(engine_config.start_urls[2].as_str(), "http://localhost:5101/database/terms");
		assert_eq!(engine_config.start_urls[3].as_str(), "http://localhost:5101/debates");
		assert_eq!(engine_config.visit_policy.query_params.len(), 2);
		assert_eq!(engine_config.visit_policy.allow_paths.len(), 7);
		assert_eq!(engine_config.visit_policy.exclude_paths.len(), 0);
		assert_eq!(engine_config.same_page_route_groups.len(), 2);
		assert_eq!(engine_config.same_page_route_groups[0].parent.as_str(), "http://localhost:5101/database/terms");
		assert_eq!(engine_config.same_page_route_groups[0].max_tabs, 5);
		assert_eq!(engine_config.same_page_route_groups[0].batch_size, 20);
		assert_eq!(engine_config.same_page_route_groups[0].child_paths.len(), 1);
		assert_eq!(engine_config.same_page_route_groups[1].parent.as_str(), "http://localhost:5101/debates");
		assert_eq!(engine_config.same_page_route_groups[1].max_tabs, 1);
		assert_eq!(engine_config.same_page_route_groups[1].batch_size, DEFAULT_SAME_PAGE_BATCH_SIZE);
		assert_eq!(engine_config.same_page_route_groups[1].lane_path_segment_count, Some(2));
		assert_eq!(engine_config.same_page_route_groups[1].child_paths.len(), 1);
		assert_eq!(engine_config.max_retries, DEFAULT_MAX_RETRIES);
		assert!(engine_config.serve.enabled);
		assert_eq!(engine_config.serve.host, "127.0.0.1");
		assert_eq!(engine_config.serve.port, 8787);
	}
}
