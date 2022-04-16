use tracing::Level;
use tracing_subscriber::{filter, Layer, prelude::__tracing_subscriber_SubscriberExt, util::SubscriberInitExt};

pub fn set_up_logging() {
    // install global collector configured based on RUST_LOG env var.
    //tracing_subscriber::fmt::init();

    let my_filter = filter::dynamic_filter_fn(|metadata, cx| {
        //println!("Target:{}", metadata.target());
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

        // also send log-entry to monitor-backend
        // todo

        true
    });
    let my_layer = tracing_subscriber::fmt::layer().with_filter(my_filter);
    tracing_subscriber::registry().with(my_layer).init();
}