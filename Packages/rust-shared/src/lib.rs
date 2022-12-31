// for IteratorV
#![feature(iterator_try_collect)]
#![feature(try_trait_v2)]
#![feature(try_trait_v2_residual)]

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

use std::time::{UNIX_EPOCH, SystemTime, Duration};

// subcrate re-exports (todo: probably replace with "pub use ? as ?;" syntax, as seen here: https://www.reddit.com/r/rust/comments/ayibls/comment/ei0ypg3)
pub extern crate rust_macros;
pub extern crate anyhow;
pub extern crate async_graphql;
pub extern crate async_graphql_axum;
pub extern crate axum;
pub extern crate bytes;
pub extern crate indoc;
pub extern crate itertools;
pub extern crate regex;
pub extern crate once_cell;
pub extern crate uuid;
pub extern crate url;
pub extern crate futures;
pub extern crate hyper;
pub extern crate reqwest;
pub extern crate serde;
pub extern crate serde_json;
pub extern crate tokio;
pub extern crate tokio_postgres;
pub extern crate tower;
pub extern crate tower_http;
pub extern crate tower_service;
pub extern crate jwt_simple;
pub extern crate chrono;
pub extern crate flume;
pub extern crate indexmap;

// this crate's modules
pub mod db_constants;
pub mod domains;
pub mod links {
    pub mod app_server_to_monitor_backend;
}
pub mod utils {
    pub mod auth {
        pub mod jwt_utils_base;
    }
    pub mod db {
        pub mod uuid;
    }
    pub mod errors;
    pub mod errors_ {
        pub mod backtrace_simplifier;
    }
    pub mod futures;
    pub mod general;
    pub mod general_ {
        pub mod extensions;
        pub mod func_types;
        pub mod serde;
    }
    pub mod _k8s;
    pub mod k8s {
        pub mod k8s_structs;
    }
    pub mod locks {
        pub mod check_lock_order;
        pub mod rwlock_tracked;
    }
    pub mod mtx {
        pub mod mtx;
    }
    pub mod time;
    pub mod type_aliases;
}

pub use utils::errors::*;
pub use utils::locks::check_lock_order::*;
pub use utils::locks::rwlock_tracked::*;