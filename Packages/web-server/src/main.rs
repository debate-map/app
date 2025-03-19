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

use globset::GlobBuilder;
use http::HeaderMap;
use rust_shared::anyhow::Error;
use static_web_server::{
	settings::{Advanced, Headers},
	Settings,
};
use std::path::PathBuf;
//use include_dir::{include_dir, Dir};

//use axum_server::main_axum;
//mod axum_server;

static STATIC_DIR_PATH: &'static str = "../client/Dist";

fn main() -> Result<(), Error> {
	//return main_axum();

	let mut opts = Settings::get(true)?;
	opts.general.port = 5100;
	opts.general.root = PathBuf::from(STATIC_DIR_PATH);
	opts.general.health = true;
	opts.general.compression_static = true;
	opts.general.page_fallback = format!("{STATIC_DIR_PATH}/index.html").into();

	// override the default cache-control-headers (which simply keeps each resource for 24hr), to only use that caching for js/css/etc. files (most important: NOT caching the index.html file, whether requested directly or as fallback)
	let compile_glob = |str: &str| GlobBuilder::new(str).build().unwrap().compile_matcher();
	opts.advanced = Some(Advanced {
		#[rustfmt::skip]
		headers: Some(vec![
            // base caching: no caching
            Headers { source: compile_glob("*"), headers: headers_for_no_caching() },
            // caching for files with extensions of 1-4 characters long: cache for one day
            Headers { source: compile_glob("*.[!/]"), headers: headers_for_caching_for_x_seconds(36000) },
            Headers { source: compile_glob("*.[!/][!/]"), headers: headers_for_caching_for_x_seconds(36000) },
            Headers { source: compile_glob("*.[!/][!/][!/]"), headers: headers_for_caching_for_x_seconds(36000) },
            Headers { source: compile_glob("*.[!/][!/][!/][!/]"), headers: headers_for_caching_for_x_seconds(36000) },
            // caching for .html files: no caching
            Headers { source: compile_glob("*.html"), headers: headers_for_no_caching() },
		]),
		..Default::default()
	});
	static_web_server::Server::new(opts)?.run_standalone(None)?;

	Ok(())
}

fn headers_for_no_caching() -> HeaderMap {
	let mut headers = HeaderMap::new();
	headers.insert("Cache-Control", "no-cache, no-store, must-revalidate".parse().unwrap());
	headers.insert("Pragma", "no-cache".parse().unwrap());
	headers.insert("Expires", "0".parse().unwrap());
	headers
}
fn headers_for_caching_for_x_seconds(seconds: u64) -> HeaderMap {
	let mut headers = HeaderMap::new();
	headers.insert("Cache-Control", format!("public, max-age={}", seconds).parse().unwrap());
	headers.insert("Pragma", "".parse().unwrap());
	headers.insert("Expires", "".parse().unwrap());
	headers
}
