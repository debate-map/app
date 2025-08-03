//! ENV:
//!   INTERVAL_MS   -> sampling interval in ms (default: 2000)
//!   LOG_PATH      -> optional file sink (e.g., /shared-logs/mem.log)
//!   THRESHOLD_PCT -> only log when usage% >= this (e.g., "85"); if unset, log every interval

mod cgroup;

use cgroup::{Cgroup, CgroupVersion};
use std::fs::OpenOptions;
use std::io::Write;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use std::{env, thread};

const DEFAULT_INTERVAL_MS: u64 = 2000;

fn now_unix() -> u64 {
	SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()
}

fn clamp_pct(p: f64) -> f64 {
	if p.is_finite() {
		if p < 0.0 {
			0.0
		} else if p > 100.0 {
			100.0
		} else {
			p
		}
	} else {
		0.0
	}
}

fn main() {
	let interval_ms: u64 = env::var("INTERVAL_MS").ok().and_then(|v| v.parse().ok()).unwrap_or(DEFAULT_INTERVAL_MS);
	let log_path = env::var("LOG_PATH").ok();
	let threshold_pct: Option<f64> = env::var("THRESHOLD_PCT").ok().and_then(|v| v.parse::<f64>().ok()).map(clamp_pct);

	let cg = Cgroup::detect();
	let version = match cg.ver {
		CgroupVersion::V2 => "v2",
		CgroupVersion::V1 => "v1",
	};
	let sleep = Duration::from_millis(interval_ms);

	loop {
		let ts = now_unix();
		let usage = cg.memory_usage_bytes().unwrap_or(0);
		let limit_opt = cg.memory_limit_bytes();

		let percent_opt = match (limit_opt, usage) {
			(Some(lim), u) if lim > 0 => Some((u as f64 / lim as f64) * 100.0),
			_ => None, // v2 "max" or invalid limit
		};

		let should_log = match (threshold_pct, percent_opt) {
			(None, _) => true,              // no threshold -> always log
			(Some(_), None) => false,       // threshold set but % unknown -> skip
			(Some(th), Some(p)) => p >= th, // log only when above/equal threshold
		};

		if should_log {
			let percent_str = percent_opt.map(|p| format!("{:.2}", p)).unwrap_or_else(|| "n/a".to_string());
			let line = format!("timestamp: {}, cg_version: {}, usage_bytes: {}, percent: {}", ts, version, usage, percent_str);
			println!("{}", line);
			if let Some(ref p) = log_path {
				if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(p) {
					let _ = writeln!(f, "{}", line);
					let _ = f.flush();
				}
			}
		}

		thread::sleep(sleep);
	}
}
