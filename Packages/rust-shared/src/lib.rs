// sync among all rust crates
#![warn(clippy::all, clippy::pedantic, clippy::cargo)]
#![allow(
    unused_imports, // makes refactoring a pain (eg. you comment out a line to test something, and now must scroll-to-top and comment lots of stuff)
    non_camel_case_types,
    non_snake_case, // makes field-names inconsistent with graphql and such, for db-struct fields
    clippy::module_name_repetitions, // too many false positives
    clippy::items_after_statements, // usefulness of custom line-grouping outweighs that of having all-items-before-statements
    clippy::expect_fun_call, // requires manual integration of error-message into the format-str, which is a pain, for usually negligible perf-gains
    clippy::redundant_closure_for_method_calls, // often means substituting a much longer method-id than the closure code itself, reducing readability
    clippy::similar_names, // too many false positives (eg. "req" and "res")
    clippy::must_use_candidate, // too many false positives
    clippy::implicit_clone, // personally, I like ownedString.to_owned(); it works the same way for &str and ownedString, meaning roughly, "Give me a new owned-version, that I can send in, regardless of the source-type."
    clippy::unused_async, // too many false positives (eg. functions that must be async to be sent as an argument to something else, like a web-server library's API)
    clippy::for_kv_map, // there are often cases where the key/value is not *currently* used, but was/will-be-soon, due to just doing a commenting test or something
    clippy::if_not_else, // there are often reasons a dev might want one of the blocks before the other

    // to avoid false-positives, of certain functions, as well as for [Serialize/Deserialize]_Stub macro-usage (wrt private fields)
    dead_code,
)]

use std::time::{UNIX_EPOCH, SystemTime, Duration};

// subcrate re-exports (todo: probably replace with "pub use ? as ?;" syntax, as seen here: https://www.reddit.com/r/rust/comments/ayibls/comment/ei0ypg3)
pub extern crate futures;
pub extern crate tokio;
pub extern crate anyhow;
pub extern crate uuid;
pub extern crate tower;
pub extern crate tower_http;
pub extern crate tower_service;
pub extern crate axum;
pub extern crate serde;
pub extern crate serde_json;
pub extern crate async_graphql;
pub extern crate async_graphql_axum;
pub extern crate bytes;
pub extern crate tokio_postgres;
pub extern crate rust_macros;

// this crate's modules
pub mod db {
    pub mod node_revisions;
}
pub mod errors;
pub mod locks;
pub mod utils {
    pub mod db {
        pub mod uuid;
    }
    pub mod db_constants;
    pub mod type_aliases;
}

pub use errors::*;
pub use locks::*;

pub fn time_since_epoch() -> Duration {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap()
}
/*pub fn time_since_epoch_ms_u128() -> u128 {
    time_since_epoch().as_millis()
}*/
pub fn time_since_epoch_ms() -> f64 {
    time_since_epoch().as_secs_f64() * 1000f64
}
pub fn time_since_epoch_ms_i64() -> i64 {
    //time_since_epoch().as_millis()
    time_since_epoch_ms() as i64
}
pub async fn tokio_sleep(sleep_time_in_ms: i64) {
    if sleep_time_in_ms <= 0 { return; }
    tokio::time::sleep(std::time::Duration::from_millis(sleep_time_in_ms as u64)).await;
}
pub async fn tokio_sleep_until(wake_time_as_ms_since_epoch: i64) {
    tokio_sleep(wake_time_as_ms_since_epoch - time_since_epoch_ms_i64()).await;
}