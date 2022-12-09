use std::{fmt, collections::HashMap, ops::Sub};

use flume::{Sender, Receiver, TrySendError};
use rust_shared::futures::executor::block_on;
use indexmap::IndexMap;
use rust_shared::itertools::Itertools;
use rust_shared::utils::time::time_since_epoch_ms;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use tracing::{Level, error, Subscriber, Metadata, subscriber::Interest, span, Event, metadata::LevelFilter, field::{Visit, Field}};
use tracing_subscriber::{filter, Layer, prelude::__tracing_subscriber_SubscriberExt, util::SubscriberInitExt, layer::{Filter, Context}};

use crate::{utils::type_aliases::ABSender, links::monitor_backend_link::{MESSAGE_SENDER_TO_MONITOR_BACKEND, Message_ASToMB}};

/*
Logging levels: (as interpreted in the debate-map codebase)
* ERROR: Indicates some flaw in the codebase that should be fixed, or an issue in the user/externally supplied data serious enough that the given operation did not proceed.
* WARN: Indicates some unexpected state that *might* be pointing toward an error/thing-to-fix, but could also just be something unusual.
* INFO: Something significant enough that it should show in the process' standard output.
* DEBUG: For low-level information that's fine to stream to the monitor-backend.
* TRACE: For low-level information that's not fine to stream to the monitor-backend. (eg. due to the expected trigger-rate being too high, to where it might congest the local network, or other layer of processing)
*/

// keep fields synced with struct in app_server_rs_link.rs (this one's the "source")
#[derive(Clone, Debug, Serialize, Deserialize)] //#[serde(crate = "rust_shared::serde")]
pub struct LogEntry {
    pub time: f64,
    pub level: String,

    //pub module_path: String,
    pub target: String, // generally, this equals module_path (but not necessarily, as per docs)
    /*pub kind: String,
    pub line_number: usize,*/
    pub span_name: String, // generally, this equals [kind + file-path + line-number] (but not necessarily, afaik)

    pub message: String,
}

pub fn should_event_be_kept_according_to_x(metadata: &Metadata, levels_to_exclude: &[Level]) -> bool {
    if levels_to_exclude.contains(metadata.level()) {
        return false;
    }
    true
}
pub fn should_event_be_printed(metadata: &Metadata) -> bool {
    // temp
    if !metadata.target().starts_with("app_server_rs") {
        return false;
    }

    should_event_be_kept_according_to_x(metadata, &[Level::TRACE, Level::DEBUG])
    //should_event_be_kept_according_to_x(metadata, &[Level::TRACE])
}
pub fn should_event_be_sent_to_monitor(metadata: &Metadata) -> bool {
    // temp
    if !metadata.target().starts_with("app_server_rs") {
        return false;
    }

    //should_event_be_kept_according_to_x(metadata, &[])
    // don't send TRACE atm, because that's intended for logging that's potentially *very* verbose, and could conceivably cause local network congestion
    // (long-term, the plan is to make a way for the monitor tool to request that verbose data for a time-slice the user specifies, if/when needed)
    should_event_be_kept_according_to_x(metadata, &[Level::TRACE])
}

pub fn set_up_logging(/*s1: ABSender<LogEntry>*/) /*-> Receiver<LogEntry>*/ {
    //let (s1, r1): (Sender<LogEntry>, Receiver<LogEntry>) = flume::unbounded();
    //let (s1, r1): (Sender<LogEntry>, Receiver<LogEntry>) = flume::bounded(10000);

    // install global collector configured based on RUST_LOG env var.
    //tracing_subscriber::fmt::init();

    /*let printing_layer_func = filter::dynamic_filter_fn(move |metadata, cx| {
        should_event_be_kept(metadata)
    });*/
    let printing_layer_func = filter::filter_fn(move |metadata| {
        should_event_be_printed(metadata)
    });

    let printing_layer = tracing_subscriber::fmt::layer().with_filter(printing_layer_func);
    //let sending_layer = Layer_WithIntercept::new(s1, r1.clone());
    //let sending_layer = Layer_WithIntercept::new(s1);
    let sending_layer = Layer_WithIntercept {};
    tracing_subscriber::registry()
        .with(sending_layer)
        .with(printing_layer)
        .init();

    //r1
}

pub struct Layer_WithIntercept {}
//impl<S: Subscriber, F: 'static + Layer<S>> Layer<S> for Layer_WithIntercept<F> {
impl<S: Subscriber> Layer<S> for Layer_WithIntercept {
    fn on_event(&self, event: &Event<'_>, _ctx: Context<'_, S>) {
        let metadata = event.metadata();
        if should_event_be_sent_to_monitor(metadata) {
            let mut entry = LogEntry {
                time: time_since_epoch_ms(),
                level: metadata.level().to_string(),
                target: metadata.target().to_owned(),
                span_name: metadata.name().to_owned(),
                //message: format!("{:?}", metadata),
                //message: metadata.fields().field("message").map(|a| a.to_string()).unwrap_or("[n/a]".to_string()),
                message: "[to be loaded...]".to_owned(),
            };
            //self.event_1st_part_sender.send(entry);

            let mut visitor = CollectorVisitor::default();
            event.record(&mut visitor);
            // todo: make-so this handles all fields
            entry.message = visitor.field_values.get("message").map(|a| a.to_owned()).unwrap_or_else(|| "[n/a]".to_string());

            //let start = std::time::Instant::now();
            block_on(async {
                /*match self.event_sender.broadcast(entry).await {
                    Ok(_) => {},
                    // if a send fails (ie. no receivers attached yet), that's fine; just print a message
                    Err(entry) => println!("Local-only log-entry (since bridge to monitor not yet set up):{entry:?}")
                };*/
                /*if let Err(err) =  {
                    //error!("Errored while broadcasting LogEntryAdded message. @error:{}", err);
                    println!("Local-only log-entry (since bridge to monitor not yet set up):{entry:?}")
                }*/
                match MESSAGE_SENDER_TO_MONITOR_BACKEND.0.broadcast(Message_ASToMB::LogEntryAdded { entry }).await {
                    Ok(_) => {},
                    // if a send fails (ie. no receivers attached yet), that's fine; just print a message
                    Err(entry) => println!("Local-only log-entry (since bridge to monitor not yet set up):{entry:?}")
                };
            });
            // typical results: 0.01ms (which seems fine; if we're logging so much that 0.01ms is a problem, we're very likely logging too much...)
            //println!("Time taken:{}", start.elapsed().as_secs_f64() * 1000f64);

            //self.event_sender.try_send(entry).unwrap();

            /*let mut target_open_slots = 10;
            loop {
                // remove messages from start of queue, until there are at least X slots open
                let entries_to_consume_to_reach_target_open_slots = self.event_sender.len().checked_sub(self.event_sender.capacity().unwrap() - target_open_slots).unwrap_or(0);
                for _i in 0..entries_to_consume_to_reach_target_open_slots {
                    #[allow(unused_must_use)] {
                        self.event_receiver.recv();
                    }
                }

                entry = match self.event_sender.try_send(entry) {
                    Ok(_) => {
                        break; // break loop, because send succeeded
                    },
                    Err(err) => {
                        match err {
                            TrySendError::Full(entry) => {
                                // no need to print error; the loop will restart, and clear enough space for new entry
                                // however, increase the target-open-slots each time (to prevent case where it keeps refilling so quickly the send can never occur)
                                target_open_slots = usize::min(self.event_sender.capacity().unwrap(), target_open_slots * 2);

                                // pass entry back (entry was consumed by try_send, so if couldn't send it, we use this line to re-bind it to the entry variable)
                                entry
                            },
                            TrySendError::Disconnected(_) => {
                                println!("Hit error while trying to send log-entry through flume channel: all receivers were dropped. Ending send-loop...");
                                break;
                            },
                        }
                    }
                };
            }*/
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