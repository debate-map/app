use anyhow::{Context, anyhow, bail};
use headless_chrome::Tab;
use headless_chrome::protocol::cdp::Page::{self, CaptureSnapshotFormatOption};
use serde_json::Value;
use std::thread::sleep;
use std::time::Duration;
use url::Url;

const TOTAL_READINESS_CHECKS: usize = 100;
const STABLE_READINESS_CHECKS: usize = 4;
const READINESS_POLL_INTERVAL: Duration = Duration::from_millis(500);

pub fn wait_until_ready(tab: &Tab, url: &Url) -> anyhow::Result<()> {
	tab.wait_until_navigated().context("wait for navigation")?;
	wait_for_stable_readiness(tab, url)
}

pub fn switch_isolated_route(tab: &Tab, url: &Url) -> anyhow::Result<()> {
	let target = serde_json::to_string(url.as_str()).context("encode target URL for JS")?;
	let js = format!(
		r#"
    (function () {{
      try {{
        const target = new URL({target}, location.href);
        target.hash = "";
        const current = new URL(location.href);
        current.hash = "";
        if (current.href !== target.href) {{
          history.pushState(null, "", target.href);
          window.dispatchEvent(new PopStateEvent("popstate", {{ state: null }}));
        }}
        return location.href;
      }} catch (e) {{
        return "__ERR__:" + (e && e.message ? e.message : String(e));
      }}
    }})();
    "#
	);

	let result = tab.evaluate(&js, false).context("isolated route eval")?;
	let val = result.value.ok_or_else(|| anyhow!("no value from isolated route eval"))?;
	let s = val.as_str().ok_or_else(|| anyhow!("unexpected isolated route return type"))?;
	if let Some(msg) = s.strip_prefix("__ERR__:") {
		return Err(anyhow!("js error: {msg}"));
	}

	wait_for_stable_readiness(tab, url)
}

pub fn extract_links(tab: &Tab) -> anyhow::Result<Vec<String>> {
	let js = r#"
    (function () {
      try {
        const out = new Set();
        const base = document.baseURI || location.href;
        const norm = u => { try { return new URL(u, base).href; } catch { return null; } };
        const add = u => {
          if (!u) return;
          if (/^(javascript:|mailto:|tel:|data:|blob:)/i.test(u)) return;
          if (u.trim().startsWith('#')) return;
          const href = norm(u);
          if (href) out.add(href.split('#')[0]);
        };
        for (const a of document.links) add(a.getAttribute('href') || a.href);
        for (const el of document.querySelectorAll('[data-href]')) add(el.getAttribute('data-href'));
        return JSON.stringify(Array.from(out));
      } catch (e) {
        return "__ERR__:" + (e && e.message ? e.message : String(e));
      }
    })();
    "#;

	let result = tab.evaluate(js, false).context("link eval")?;
	let val = result.value.ok_or_else(|| anyhow!("no value from link eval"))?;
	let s = val.as_str().ok_or_else(|| anyhow!("unexpected return type"))?;
	if let Some(msg) = s.strip_prefix("__ERR__:") {
		return Err(anyhow!("js error: {msg}"));
	}

	let arr: Value = serde_json::from_str(s).context("parse link json")?;
	let mut links = arr.as_array().into_iter().flatten().filter_map(|value| value.as_str().map(str::to_string)).collect::<Vec<_>>();
	links.sort_unstable();
	links.dedup();
	Ok(links)
}

pub fn capture_mhtml(tab: &Tab) -> anyhow::Result<String> {
	Ok(tab.call_method(Page::CaptureSnapshot { format: Some(CaptureSnapshotFormatOption::Mhtml) })?.data)
}

fn wait_for_stable_readiness(tab: &Tab, url: &Url) -> anyhow::Result<()> {
	let mut stable_count = 0;
	let mut last_state = String::from("unknown");

	for _ in 0..TOTAL_READINESS_CHECKS {
		let state = readiness_state(tab, url)?;
		if state.starts_with("internalCrawler error:") {
			bail!("{state}");
		}

		if state.starts_with("ready") {
			stable_count = if state == last_state { stable_count + 1 } else { 1 };
			if stable_count >= STABLE_READINESS_CHECKS {
				return Ok(());
			}
		} else {
			stable_count = 0;
		}
		last_state = state;
		sleep(READINESS_POLL_INTERVAL);
	}

	bail!("Page did not stabilize after {} checks; last state: {}", TOTAL_READINESS_CHECKS, last_state);
}

fn readiness_state(tab: &Tab, url: &Url) -> anyhow::Result<String> {
	let js = r#"
    (function (requiresMap) {
      try {
        const crawler = window.internalCrawler;
        if (crawler && typeof crawler === "object" && "status" in crawler) {
          const path = typeof crawler.path === "string" ? crawler.path : window.location.pathname;
          if (path !== window.location.pathname) {
            return "internalCrawler path mismatch";
          }
          const status = String(crawler.status || "loading");
          if (status === "error") {
            return "internalCrawler error: " + (crawler.reason || "unknown");
          }
          if (status !== "ready") return "internalCrawler " + status;
        } else if (document.readyState !== "complete") {
          return "document " + document.readyState;
        }

        const visibleText = document.body ? (document.body.innerText || "") : "";
        if (visibleText.includes("Loading...")) return "visible Loading...";

		const map = document.querySelector(".MapUI");
		if (!map) return requiresMap ? "expected map missing" : "ready";

		const loadingNodes = map.querySelectorAll('[data-internal-crawler-loading="true"]');
		if (loadingNodes.length > 0) return `map data loading (${loadingNodes.length} nodes)`;

		const nodes = Array.from(map.querySelectorAll(".NodeUI"));
		if (nodes.length === 0) return "map has no nodes";
		const visibleNodes = nodes.filter(node => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return Number(style.opacity) > 0.99 && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
		});
		if (visibleNodes.length === 0) return `map layout hidden (${nodes.length} nodes)`;

		let hash = 2166136261;
		for (const node of visibleNodes) {
			const rect = node.getBoundingClientRect();
			const path = node.querySelector(".NodeBox")?.getAttribute("data-nodebox-path") || "";
			const value = `${path}:${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.width)}:${Math.round(rect.height)};`;
			for (let i = 0; i < value.length; i++) {
				hash ^= value.charCodeAt(i);
				hash = Math.imul(hash, 16777619);
			}
		}
		return `ready map:${visibleNodes.length}/${nodes.length}:${hash >>> 0}`;
      } catch (e) {
        return "__ERR__:" + (e && e.message ? e.message : String(e));
      }
    })($REQUIRES_MAP);
    "#
	.replace("$REQUIRES_MAP", if requires_map(url) { "true" } else { "false" });

	let result = tab.evaluate(&js, false).context("readiness eval")?;
	let val = result.value.ok_or_else(|| anyhow!("no value from readiness eval"))?;
	let state = val.as_str().ok_or_else(|| anyhow!("unexpected readiness return type"))?.to_string();

	if let Some(msg) = state.strip_prefix("__ERR__:") {
		return Err(anyhow!("js error: {msg}"));
	}

	Ok(state)
}

fn requires_map(url: &Url) -> bool {
	let mut segments = url.path_segments().into_iter().flatten();
	segments.next() == Some("debates") && segments.next().is_some_and(|segment| !segment.is_empty() && segment != "all")
}

#[cfg(test)]
mod tests {
	use super::requires_map;
	use url::Url;

	#[test]
	fn identifies_debate_map_routes() {
		for (path, expected) in [("/debates", false), ("/debates/all", false), ("/debates/map-id", true), ("/debates/map-id/node-id", true), ("/database/terms", false)] {
			assert_eq!(requires_map(&Url::parse(&format!("http://localhost{path}")).unwrap()), expected, "{path}");
		}
	}
}
