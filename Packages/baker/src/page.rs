use anyhow::{Context, anyhow, bail};
use headless_chrome::Tab;
use headless_chrome::protocol::cdp::Page::{self, CaptureSnapshotFormatOption};
use serde_json::Value;
use std::thread::sleep;
use std::time::Duration;
use tracing::info;
use url::Url;

const TOTAL_READINESS_CHECKS: usize = 100;
const STABLE_READINESS_CHECKS: usize = 10;
const READINESS_POLL_INTERVAL: Duration = Duration::from_millis(500);
const POST_NAVIGATION_RENDER_DELAY: Duration = Duration::from_secs(3);
const SPA_NAVIGATION_RENDER_DELAY: Duration = Duration::from_millis(500);

pub fn wait_until_ready(tab: &Tab, url: &Url) -> anyhow::Result<()> {
	tab.wait_until_navigated().context("wait for navigation")?;
	sleep(POST_NAVIGATION_RENDER_DELAY);
	wait_for_stable_readiness(tab)?;
	prepare_route(tab, url)
}

pub fn switch_same_page_route(tab: &Tab, url: &Url) -> anyhow::Result<()> {
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

	let result = tab.evaluate(&js, false).context("same-page route eval")?;
	let val = result.value.ok_or_else(|| anyhow!("no value from same-page route eval"))?;
	let s = val.as_str().ok_or_else(|| anyhow!("unexpected same-page route return type"))?;
	if let Some(msg) = s.strip_prefix("__ERR__:") {
		return Err(anyhow!("js error: {msg}"));
	}

	sleep(SPA_NAVIGATION_RENDER_DELAY);
	wait_for_stable_readiness(tab)?;
	prepare_route(tab, url)
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

fn wait_for_stable_readiness(tab: &Tab) -> anyhow::Result<()> {
	let mut stable_count = 0;
	let mut last_state = String::from("unknown");

	for _ in 0..TOTAL_READINESS_CHECKS {
		let state = readiness_state(tab)?;
		if state.starts_with("internalCrawler error:") {
			bail!("{state}");
		}

		if state == "ready" {
			stable_count += 1;
			if stable_count >= STABLE_READINESS_CHECKS {
				return Ok(());
			}
		} else {
			stable_count = 0;
			last_state = state;
		}
		sleep(READINESS_POLL_INTERVAL);
	}

	bail!("Page did not stabilize after {} checks; last state: {}", TOTAL_READINESS_CHECKS, last_state);
}

fn readiness_state(tab: &Tab) -> anyhow::Result<String> {
	let js = r#"
    (function () {
      try {
        const crawler = window.internalCrawler;
        if (crawler && typeof crawler === "object" && "status" in crawler) {
          const path = typeof crawler.path === "string" ? crawler.path : window.location.pathname;
          if (path !== window.location.pathname) {
            return "internalCrawler path mismatch";
          }
          const status = String(crawler.status || "loading");
          if (status === "ready") return "ready";
          if (status === "error") {
            return "internalCrawler error: " + (crawler.reason || "unknown");
          }
          return "internalCrawler " + status;
        }

        if (document.readyState !== "complete") {
          return "document " + document.readyState;
        }

        const visibleText = document.body ? (document.body.innerText || "") : "";
        return visibleText.includes("Loading...") ? "visible Loading..." : "ready";
      } catch (e) {
        return "__ERR__:" + (e && e.message ? e.message : String(e));
      }
    })();
    "#;

	let result = tab.evaluate(js, false).context("readiness eval")?;
	let val = result.value.ok_or_else(|| anyhow!("no value from readiness eval"))?;
	let state = val.as_str().ok_or_else(|| anyhow!("unexpected readiness return type"))?.to_string();

	if let Some(msg) = state.strip_prefix("__ERR__:") {
		return Err(anyhow!("js error: {msg}"));
	}

	Ok(state)
}

fn prepare_route(tab: &Tab, url: &Url) -> anyhow::Result<()> {
	if url.path() == "/debates" {
		expand_debates_index(tab)
	} else if url.path().starts_with("/debates/") {
		expand_debate_detail(tab)
	} else {
		Ok(())
	}
}

fn expand_debates_index(tab: &Tab) -> anyhow::Result<()> {
	info!("At /debates page, attempting to click 'All' button to show all debates");
	let elements = tab.find_elements("div.ButtonBar_OptionUI")?;
	for el in elements {
		if let Ok(text) = el.get_inner_text()
			&& text.trim_start().starts_with("All")
		{
			el.click()?;
			sleep(Duration::from_secs(25));
			return Ok(());
		}
	}

	Err(anyhow!("No element starting with 'All' found"))
}

fn expand_debate_detail(tab: &Tab) -> anyhow::Result<()> {
	loop {
		let js = r#"
            (() => {
                const boxes = document.querySelectorAll('div.ExpandableBox_mainContent');
                let clicked = 0;
                boxes.forEach(box => {
                    const btn = box.querySelector('div.Button');
                    if (btn && btn.textContent.trim() === '>') {
                        btn.click();
                        clicked++;
                    }
                });
                return clicked;
            })();
        "#;

		let res = tab.evaluate(js, true)?;
		let clicked = res.value.and_then(|v| v.as_i64()).unwrap_or(0);

		if clicked == 0 {
			info!("No more expandable boxes found");
			break;
		}

		info!("Expanded {} boxes, waiting 60s for next batch", clicked);
		sleep(Duration::from_secs(60));
	}

	Ok(())
}
