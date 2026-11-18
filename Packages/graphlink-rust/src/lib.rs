#![feature(let_chains)]
#![feature(async_closure)]
// for IteratorV
#![feature(iterator_try_collect)]
#![feature(try_trait_v2)]
#![feature(try_trait_v2_residual)]
// needed atm for GQLError (see TODO.rs)
#![feature(auto_traits)]
#![feature(negative_impls)]
#![feature(try_blocks)]
#![recursion_limit = "512"]
// for lock-chain checks
#![allow(incomplete_features)]
#![feature(adt_const_params)]
#![feature(generic_const_exprs)]
// sync among all rust crates
#![warn(clippy::all, clippy::pedantic, clippy::cargo)]
#![allow(
    unused_imports, // makes refactoring a pain (eg. you comment out a line to test something, and now must scroll-to-top and comment lots of stuff) [more importantly, conflicts with wrap_slow_macros! atm; need to resolve that]
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
#![feature(stmt_expr_attributes)] // allow attributes on expressions, eg. for disabling rustfmt per-expression

use std::time::{Duration, SystemTime, UNIX_EPOCH};

// subcrate re-exports (todo: probably replace with "pub use ? as ?;" syntax, as seen here: https://www.reddit.com/r/rust/comments/ayibls/comment/ei0ypg3)
pub use anyhow;
pub use async_broadcast;
pub use async_graphql;
pub use async_graphql_axum;
pub use axum;
pub use base64;
pub use bytes;
pub use chrono;
pub use deadpool;
pub use deadpool_postgres;
pub use flume;
pub use futures;
pub use http_body_util;
pub use hyper;
pub use hyper_util;
pub use indexmap;
pub use indoc;
pub use itertools;
pub use jwt_simple;
pub use lazy_static;
pub use lexicon_fractional_index;
pub use num_cpus;
pub use oauth2;
pub use once_cell;
pub use postgres_protocol;
pub use regex;
pub use reqwest;
pub use rust_macros;
pub use sentry;
pub use serde;
pub use serde_json;
pub use thiserror;
pub use tokio;
pub use tokio_postgres;
pub use tokio_tungstenite;
pub use tower;
pub use tower_http;
pub use tower_service;
pub use tracing;
pub use url;
pub use uuid;

// Helper macro, giving an easier way to disable the wrap_slow_macros temporarily. (commented, since not really needed, now that wrap_async_graphql keeps refs to replaced imports)
/*#[macro_use]
mod helper_macros {
	// macro that just returns the original code
	macro_rules! wrap_slow_macros_DISABLED {
		($($item:item)*) => { $($item)* };
	}
}*/

// this crate's modules
automod_plus::dir!(pub "./src" "#[use],mtx/mtx/,CACHE_BUSTER_1");
