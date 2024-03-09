#![feature(let_chains)]
//#![feature(unsized_locals)]
//#![feature(unsized_fn_params)]
//#![feature(integer_atomics, const_fn_trait_bound)] // needed for mem_alloc.rs
//#![feature(box_patterns)]
//#![feature(fn_traits)]
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

use rust_shared::{tokio, sentry, domains::{DomainsConstants, get_env}};
use store::storage::AppStateArc;
use tracing::{error};

use crate::{links::{pgclient::{self, start_pgclient_with_restart}, db_live_cache::start_db_live_cache}, globals::{set_up_globals}, router::start_router, store::storage::AppState, utils::general::data_anchor::DataAnchorFor1};

// folders (we only use "folder_x/mod.rs" files one-layer deep; keeps the mod-tree structure out of main.rs, while avoiding tons of mod.rs files littering the codebase)
mod db;
mod links;
mod store;
mod utils;
// files
mod globals;
mod gql;
mod router;

//#[tokio::main(flavor = "multi_thread", worker_threads = 7)]
#[tokio::main]
async fn main() {
    let _sentry_guard = set_up_globals();
    println!("Setup of globals completed."); // have one regular print-line, in case logger has issues

    let app_state = AppState::new_in_arc();

    // start pg-client; this monitors the database for changes, and pushes those change-events to live-query system
    start_pgclient_with_restart(app_state.clone());

    // start db-live-cache; this launches some live-queries for certain data (eg. list of admin user-ids, and access-policies), and keeps those results in memory
    start_db_live_cache(app_state.clone());

    // start router; this handles all "external web requests"
    start_router(app_state).await;
}