use std::{fmt, collections::HashMap};

use flume::{Sender, Receiver};
use indexmap::IndexMap;
use itertools::Itertools;
use serde::Serialize;
use serde_json::json;
use tracing::{Level, error, Subscriber, Metadata, subscriber::Interest, span, Event, metadata::LevelFilter, field::{Visit, Field}};
use tracing_subscriber::{filter, Layer, prelude::__tracing_subscriber_SubscriberExt, util::SubscriberInitExt, layer::{Filter, Context}};

use super::general::time_since_epoch_ms;

#[derive(Serialize)]
pub struct LogEntry {
    time: f64,
    level: String,

    span_name: String,
    /*kind: String,
    module_path: String,
    line_number: usize,*/
    target: String, // also include this, since according to docs, it *may* be different than what's present in span_name and module_path

    message: String,
}

pub fn should_event_be_kept(metadata: &Metadata) -> bool {
    // temp
    if !metadata.target().starts_with("app_server_rs") {
        return false;
    }
    if matches!(*metadata.level(), Level::TRACE | Level::DEBUG) {
        return false;
    }
        
    // If this *is* "interesting_span", make sure to enable it.
    /*if metadata.is_span() && metadata.name() == "interesting_span" {
        return true;
    }
    // Otherwise, are we in an interesting span?
    if let Some(current_span) = cx.lookup_current() {
        return current_span..name() == "interesting_span";
    }
    false*/

    true
}

pub fn set_up_logging() -> Receiver<LogEntry> {
    let (s1, r1): (Sender<LogEntry>, Receiver<LogEntry>) = flume::unbounded();

    // install global collector configured based on RUST_LOG env var.
    //tracing_subscriber::fmt::init();

    /*let printing_layer_func = filter::dynamic_filter_fn(move |metadata, cx| {
        should_event_be_kept(metadata)
    });*/
    let printing_layer_func = filter::filter_fn(move |metadata| {
        should_event_be_kept(metadata)
    });

    let printing_layer = tracing_subscriber::fmt::layer().with_filter(printing_layer_func);
    let sending_layer = Layer_WithIntercept::new(s1);
    tracing_subscriber::registry()
        .with(sending_layer)
        .with(printing_layer)
        .init();

    r1
}

pub struct Layer_WithIntercept/*<F>*/ {
    //base_layer: F,
    event_sender: Sender<LogEntry>,
    /*event_1st_part_sender: Sender<LogEntry>,
    event_1st_part_receiver: Receiver<LogEntry>,*/
}
impl/*<F>*/ Layer_WithIntercept/*<F>*/ {
    pub fn new(
        //base_layer: F,
        event_sender: Sender<LogEntry>
    ) -> Self {
        //let (s1, r1): (Sender<LogEntry>, Receiver<LogEntry>) = flume::unbounded();
        Self {
            //base_layer,
            event_sender,
            /*event_1st_part_sender: s1,
            event_1st_part_receiver: r1,*/
        }
    }
}
//impl<S: Subscriber, F: 'static + Layer<S>> Layer<S> for Layer_WithIntercept<F> {
impl<S: Subscriber> Layer<S> for Layer_WithIntercept {
    fn on_event(&self, event: &Event<'_>, ctx: Context<'_, S>) {
        let metadata = event.metadata();
        if should_event_be_kept(metadata) {
            let mut entry = LogEntry {
                time: time_since_epoch_ms(),
                level: metadata.level().to_string(),
                span_name: metadata.name().to_owned(),
                target: metadata.target().to_owned(),
                //message: format!("{:?}", metadata),
                //message: metadata.fields().field("message").map(|a| a.to_string()).unwrap_or("[n/a]".to_string()),
                message: "[to be loaded...]".to_owned(),
            };
            //self.event_1st_part_sender.send(entry);

            let mut visitor = CollectorVisitor::default();
            event.record(&mut visitor);
            // todo: make-so this handles all fields
            entry.message = visitor.field_values.get("message").map(|a| a.to_owned()).unwrap_or_else(|| "[n/a]".to_string());

            match self.event_sender.send(entry) {
                Ok(_) => {},
                Err(err) => {
                    eprintln!("Hit error while trying to send log-entry through flume channel:{}", err);
                }
            };
        }
        
        //dbg!(self.base_layer.on_event(event, ctx));
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