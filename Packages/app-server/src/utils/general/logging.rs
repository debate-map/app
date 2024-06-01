use std::collections::HashSet;
use std::sync::Mutex;
use std::{collections::HashMap, fmt, ops::Sub};

use rust_shared::flume::{Receiver, Sender, TrySendError};
use rust_shared::futures::executor::block_on;
use rust_shared::indexmap::IndexMap;
use rust_shared::itertools::Itertools;
use rust_shared::links::app_server_to_monitor_backend::{LogEntry, Message_ASToMB};
use rust_shared::once_cell::sync::Lazy;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::utils::time::time_since_epoch_ms;
use rust_shared::{sentry, to_anyhow};
use tracing::{
	error,
	field::{Field, Visit},
	metadata::LevelFilter,
	span,
	subscriber::Interest,
	Event, Level, Metadata, Subscriber,
};
use tracing_subscriber::{
	filter,
	layer::{Context, Filter},
	prelude::__tracing_subscriber_SubscriberExt,
	util::SubscriberInitExt,
	Layer,
};

use crate::{links::monitor_backend_link::MESSAGE_SENDER_TO_MONITOR_BACKEND, utils::type_aliases::ABSender};

pub fn does_event_match_conditions(metadata: &Metadata, levels_to_include: &[Level]) -> bool {
	if !levels_to_include.contains(metadata.level()) {
		return false;
	}
	true
}

// create index-map in once cell
static OBSERVED_TRACING_EVENT_TARGETS: Lazy<Mutex<Vec<String>>> = Lazy::new(|| Mutex::new(Vec::new()));

pub fn target_matches(target: &str, module_paths: &[&str]) -> bool {
	for module_path in module_paths {
		if target == *module_path || target.starts_with(&format!("{}::", module_path)) {
			return true;
		}
	}
	false
}
pub fn should_event_be_printed(metadata: &Metadata) -> bool {
	let target = metadata.target();

	// when you enable this, only do it temporarily, to check the list of tracing targets
	let mut cache = OBSERVED_TRACING_EVENT_TARGETS.lock().unwrap();
	if !cache.contains(&target.to_owned()) {
		cache.push(target.to_owned());
		//println!("Tracing targets observed so far: {}", cache.iter().format(", "));
		println!("Observed new target in tracing: {}", target);
	}

	match target {
		t if target_matches(t, &["app_server", "rust_shared"]) => {
			does_event_match_conditions(metadata, &[Level::ERROR, Level::WARN, Level::INFO])
			//should_event_be_kept_according_to_x(metadata, &[Level::ERROR, Level::WARN, Level::INFO, Level::DEBUG])
		},
		t if target_matches(t, &["async-graphql"]) => does_event_match_conditions(metadata, &[Level::ERROR, Level::WARN]),
		// temp
		//t if target_matches(t, &["hyper"]) => true,
		//t if target_matches(t, &["tower_http::trace::on_request", "tower_http::trace::on_response"]) => true,
		t if target_matches(t, &["tower_http::"]) => true,
		// fallback
		_ => false,
	}
}
pub fn should_event_be_sent_to_monitor(metadata: &Metadata) -> bool {
	match metadata.target() {
		a if a.starts_with("app_server") || a.starts_with("rust_shared") => {
			//does_event_match_conditions(metadata, &[Level::ERROR, Level::WARN, Level::INFO, Level::DEBUG, Level::TRACE])
			// don't send TRACE atm, because that's intended for logging that's potentially *very* verbose, and could conceivably cause local network congestion
			// (long-term, the plan is to make a way for the monitor tool to request that verbose data for a time-slice the user specifies, if/when needed)
			does_event_match_conditions(metadata, &[Level::ERROR, Level::WARN, Level::INFO, Level::DEBUG])
		},
		"async-graphql" => does_event_match_conditions(metadata, &[Level::ERROR, Level::WARN]),
		_ => false,
	}
}

pub fn set_up_logging() {
	let printing_layer_func = filter::filter_fn(move |metadata| should_event_be_printed(metadata));

	let printing_layer = tracing_subscriber::fmt::layer().with_filter(printing_layer_func);
	let sending_layer = Layer_WithIntercept {};

	// IMPORTANT NOTE: For some reason, calls to `log::warn` and such get logged to the standard-out (probably passing through `printing_layer` above), but NOT to the `sending_layer`.
	// So until the source issue is investigated, make sure to always using `tracing::X` instead of `log::X` in the codebase. (else those log-messages won't get sent to monitor-tool)
	tracing_subscriber::registry().with(sending_layer).with(printing_layer).with(sentry::integrations::tracing::layer()).init();
}

pub struct Layer_WithIntercept {}
impl<S: Subscriber> Layer<S> for Layer_WithIntercept {
	fn on_event(&self, event: &Event<'_>, _ctx: Context<'_, S>) {
		let metadata = event.metadata();
		if should_event_be_sent_to_monitor(metadata) {
			let mut entry = LogEntry {
				time: time_since_epoch_ms(),
				level: metadata.level().to_string(),
				target: metadata.target().to_owned(),
				span_name: metadata.name().to_owned(),
				message: "[to be loaded...]".to_owned(),
			};

			let mut visitor = CollectorVisitor::default();
			event.record(&mut visitor);
			// todo: make-so this handles all fields
			entry.message = visitor.field_values.get("message").map(|a| a.to_owned()).unwrap_or_else(|| "[n/a]".to_string());

			//let start = std::time::Instant::now();
			block_on(async {
				match MESSAGE_SENDER_TO_MONITOR_BACKEND.0.broadcast(Message_ASToMB::LogEntryAdded { entry }).await {
					Ok(_) => {},
					// if a send fails (ie. no receivers attached yet), that's fine; just print a message
					Err(entry) => println!("Local-only log-entry (since bridge to monitor not yet set up):{entry:?}"),
				};
			});
			// typical results: 0.01ms (which seems fine; if we're logging so much that 0.01ms is a problem, we're very likely logging too much...)
			//println!("Time taken:{}", start.elapsed().as_secs_f64() * 1000f64);
		}
	}
}

#[derive(Default)]
pub struct CollectorVisitor {
	pub field_values: IndexMap<String, String>,
}
impl Visit for CollectorVisitor {
	/// Visit a value implementing `fmt::Debug`.
	fn record_debug(&mut self, field: &Field, value: &dyn fmt::Debug) {
		self.field_values.insert(field.name().to_owned(), format!("{:?}", value));
	}
}
