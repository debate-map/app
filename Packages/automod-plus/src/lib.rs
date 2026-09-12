//! [![github]](https://github.com/dtolnay/automod)&ensp;[![crates-io]](https://crates.io/crates/automod)&ensp;[![docs-rs]](https://docs.rs/automod)
//!
//! [github]: https://img.shields.io/badge/github-8da0cb?style=for-the-badge&labelColor=555555&logo=github
//! [crates-io]: https://img.shields.io/badge/crates.io-fc8d62?style=for-the-badge&labelColor=555555&logo=rust
//! [docs-rs]: https://img.shields.io/badge/docs.rs-66c2a5?style=for-the-badge&labelColor=555555&logo=docs.rs
//!
//! <br>
//!
//! **Pull in every source file in a directory as a module.**
//!
//! # Syntax
//!
//! ```
//! # const IGNORE: &str = stringify! {
//! automod::dir!("path/to/directory");
//! # };
//! ```
//!
//! This macro expands to one or more `mod` items, one for each source file in
//! the specified directory.
//!
//! The path is given relative to the directory containing Cargo.toml.
//!
//! It is an error if the given directory contains no source files.
//!
//! The macro takes an optional visibility to apply on the generated modules:
//! `automod::dir!(pub "path/to/directory")`.
//!
//! # Example
//!
//! Suppose that we would like to keep a directory of regression tests for
//! individual numbered issues:
//!
//! - tests/
//!   - regression/
//!     - issue1.rs
//!     - issue2.rs
//!     - ...
//!     - issue128.rs
//!
//! We would like to be able to toss files in this directory and have them
//! automatically tested, without listing them in some explicit list of modules.
//! Automod solves this by adding *tests/regression.rs* containing:
//!
//! ```
//! # const IGNORE: &str = stringify! {
//! mod regression {
//!     automod::dir!("tests/regression");
//! }
//! # };
//! ```
//!
//! The macro invocation expands to:
//!
//! ```
//! # const IGNORE: &str = stringify! {
//! mod issue1;
//! mod issue2;
//! /* ... */
//! mod issue128;
//! # };
//! ```

#![doc(html_root_url = "https://docs.rs/automod/1.0.14")]
#![allow(clippy::enum_glob_use, clippy::needless_pass_by_value)]

extern crate proc_macro;

mod error;

use crate::error::{Error, Result};
use proc_macro::TokenStream;
use proc_macro2::{Ident, Span, TokenStream as TokenStream2};
use quote::quote;
use std::env;
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use syn::parse::{Parse, ParseStream};
use syn::{parse_macro_input, LitStr, Visibility};

struct Options {
	vis: Visibility,
	#[allow(dead_code)]
	path_rel: String,
	path_full: PathBuf,
	add_use: bool,
	exclude_paths_containing: Vec<String>,
	// while not technically an option, for convenience we store the amassed module-paths here (for adding the "use X::*" lines)
	mod_paths: Mutex<Vec<String>>,
}

impl Parse for Options {
	fn parse(input: ParseStream) -> syn::Result<Self> {
		let vis = input.parse()?;
		let path_rel: String = input.parse::<LitStr>()?.value();
		let path_full = match env::var_os("CARGO_MANIFEST_DIR") {
			None => PathBuf::from(path_rel.clone()),
			Some(manifest_dir) => PathBuf::from(manifest_dir).join(path_rel.clone()),
		};

		let options_str_literal: LitStr = input.parse()?; // todo: make optional
		let options_str: String = options_str_literal.value();
		let options_str_parts: Vec<_> = options_str.split(',').filter_map(|s| if s.is_empty() { None } else { Some(s.to_string()) }).collect();
		let mut add_use = false;
		let mut exclude_paths_containing = Vec::new();
		for part in options_str_parts {
			if part == "#[use]" {
				add_use = true;
			} else {
				exclude_paths_containing.push(part);
			}
		}
		Ok(Options { vis, path_rel, path_full, add_use, exclude_paths_containing, mod_paths: Mutex::new(vec![]) })
	}
}

#[proc_macro]
pub fn dir(input: TokenStream) -> TokenStream {
	let opts = parse_macro_input!(input as Options);

	let tokens_from_mod_entries: TokenStream2 = match folder_to_mod_entry(&opts, &opts.path_full) {
		Err(err) => syn::Error::new(Span::call_site(), err).to_compile_error(),
		Ok(root_mod_entry) => root_mod_entry.children.into_iter().map(|child| mod_entry_to_tokens(&opts, child)).collect(),
	};

	let tokens_from_mod_use_lines: Vec<TokenStream2> = if opts.add_use {
		let mod_paths = opts.mod_paths.lock().unwrap();
		let use_lines = mod_paths.iter().map(|mod_path| {
			let path: syn::Path = syn::parse_str(mod_path).unwrap();
			//quote! { pub use super::#path::*; }
			quote! { pub use #path::*; }
		});
		use_lines.collect()
	} else {
		Vec::new()
	};

	let all_tokens = quote! {
		#tokens_from_mod_entries
		#(#tokens_from_mod_use_lines)*
	};
	TokenStream::from(all_tokens)
}

fn mod_entry_to_tokens(opts: &Options, entry: ModEntry) -> TokenStream2 {
	let mod_name = file_path_to_mod_path(opts, entry.name.clone().into()).0;
	let (mod_path, mod_path_differs) = file_path_to_mod_path(opts, entry.path);
	let mod_path_if_differs: core::option::IntoIter<String> = Option::into_iter(if mod_path_differs { Some(mod_path.clone()) } else { None });
	// only include files in the "mod paths" vec; otherwise when the "use PATH::*;" lines are added, crate's space get polluted (and is thus ambiguous) due to subfolder/subfile mod-names themselves getting re-exported
	if entry.is_file {
		let mut mod_paths = opts.mod_paths.lock().unwrap();
		mod_paths.push(mod_path.clone());
	}

	match entry.is_file {
		true => {
			let vis = &opts.vis;
			let ident = Ident::new(&mod_name, Span::call_site());
			quote! {
				#(#[path = #mod_path_if_differs])*
				#vis mod #ident;
			}
		},
		false => {
			let vis = &opts.vis;
			let ident = Ident::new(&mod_name, Span::call_site());
			let children_token_streams = entry.children.into_iter().map(|child| mod_entry_to_tokens(&opts, child));
			quote! {
				#(#[path = #mod_path_if_differs])*
				#vis mod #ident {
					#(#children_token_streams)*
				}
			}
		},
	}
}

fn file_path_to_mod_path(opts: &Options, file_path: PathBuf) -> (String, bool) {
	let file_path_rel = file_path.strip_prefix(&opts.path_full).unwrap_or(&file_path);
	let file_path_rel_as_str = file_path_rel.to_string_lossy().replace('\\', "/").replace(".rs", "");
	let path_parts = file_path_rel_as_str.split('/').collect::<Vec<_>>();

	let mut module_path = vec![];
	for part in path_parts {
		let mut part = part.replace('-', "_");
		if part.starts_with(|ch: char| ch.is_ascii_digit()) {
			part.insert(0, '_');
		}
		module_path.push(part);
	}
	let mod_path = module_path.join("::");
	let mod_path_differs = mod_path != file_path_rel_as_str.replace('/', "::");
	(mod_path, mod_path_differs)

	/*file_path
	.file_stem()
	.and_then(|name| name.to_str())
	.map(|name| name.replace('-', "_"))
	.unwrap_or_else(|| "<file name is not a valid module name>".to_string())*/
}

struct ModEntry {
	name: String,
	path: PathBuf,
	is_file: bool,
	children: Vec<ModEntry>,
}
impl Ord for ModEntry {
	fn cmp(&self, other: &Self) -> std::cmp::Ordering {
		self.name.cmp(&other.name)
	}
}
impl PartialOrd for ModEntry {
	fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
		Some(self.cmp(other))
	}
}
impl Eq for ModEntry {}
impl PartialEq for ModEntry {
	fn eq(&self, other: &Self) -> bool {
		self.name == other.name
	}
}

fn folder_to_mod_entry<P: AsRef<Path>>(opts: &Options, dir: P) -> Result<ModEntry> {
	let name = dir.as_ref().file_name().and_then(|name| name.to_str().map(|s| s.to_string())).unwrap_or_else(|| "<folder name is not a valid module name>".to_string());
	let path = dir.as_ref().to_path_buf();
	let mut children: Vec<ModEntry> = Vec::new();
	let mut failures: Vec<Error> = Vec::new();

	for child in fs::read_dir(dir)? {
		let child = child?;
		let child_is_file = child.file_type()?.is_file();

		let child_path = child.path();
		let full_path_str = child_path.to_string_lossy();
		let full_path_str_with_consistent_slashes = full_path_str.replace("\\", "/")
			// add trailing slash to folders, so we can exclude folder of folder+file combo without excluding the file at the same time (later can add "X/*" if only want children excluded)
			+ if child_is_file { "" } else { "/" };
		if opts.exclude_paths_containing.iter().any(|s| full_path_str_with_consistent_slashes.contains(s)) {
			continue;
		}

		match child_is_file {
			true => {
				let file_name = child.file_name();
				if file_name == "mod.rs" || file_name == "lib.rs" || file_name == "main.rs" {
					continue;
				}

				if child_path.extension() == Some(OsStr::new("rs")) {
					match file_name.into_string() {
						Ok(mut utf8) => {
							utf8.truncate(utf8.len() - ".rs".len());
							children.push(ModEntry { name: utf8, path: child_path, is_file: true, children: vec![] });
						},
						Err(non_utf8) => {
							failures.push(Error::Utf8(non_utf8));
						},
					}
				}
			},
			false => match folder_to_mod_entry(opts, child_path) {
				Ok(child_dir_mod_entry) => children.push(child_dir_mod_entry),
				Err(err) => failures.push(err),
			},
		}
	}

	//failures.sort();
	if let Some(failure) = failures.into_iter().next() {
		return Err(failure);
	}

	/*if children.is_empty() {
		return Err(Error::Empty);
	}*/

	children.sort();
	Ok(ModEntry { name, path, is_file: false, children })
}
