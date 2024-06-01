use proc_macro2::{Ident, Span, TokenStream, TokenTree};
use std::{env, str::FromStr};

use crate::utils::{remove_token_sequences_for_macros, replace_token_sequences_matching, Slot};

// test-approach, of just stripping all the async-graphql macros for cargo-check (since presumably not needed at that point)
// ==========

pub fn wrap_serde_macros_impl(input: TokenStream, force_proceed: bool) -> TokenStream {
	let proceed = force_proceed || {
		let mut temp = false;
		if let Ok(val) = env::var("FOR_RUST_ANALYZER") {
			if val == "1" {
				println!("Macro wrap_serde_macros: Modifying tokens, since FOR_RUST_ANALYZER is true.");
				temp = true;
			}
		}
		temp
	};
	if !proceed {
		return input;
	}

	let output = input.clone();
	let output = replace_serde_macros(output);
	output
}

static MACROS_TO_REMOVE: &'static [&'static str] = &["serde"];
static DERIVE_MACRO_REPLACEMENTS_FROM: &'static [&'static str] = &["Serialize", "Deserialize"];
static DERIVE_MACRO_REPLACEMENTS_TO: &'static [&'static str] = &["rust_shared::rust_macros::Serialize_Stub", "rust_shared::rust_macros::Deserialize_Stub"];
fn replace_serde_macros(tokens: TokenStream) -> TokenStream {
	let mut result = tokens;

	result = remove_token_sequences_for_macros(result, MACROS_TO_REMOVE);

	for (i, from_macro) in DERIVE_MACRO_REPLACEMENTS_FROM.iter().enumerate() {
		let mut slots: Vec<Slot> = Vec::new();
		let check = Box::new(|token: &TokenTree| {
			match token {
				TokenTree::Ident(data) if data.to_string() == from_macro.to_owned() => {
					//println!("Found match!:{}", token);
					true
				},
				_ => false,
			}
		});

		let replacement_str = DERIVE_MACRO_REPLACEMENTS_TO[i];
		let replacement_tokens: Vec<TokenTree> = if replacement_str.contains("::") {
			TokenStream::from_str(replacement_str).unwrap().into_iter().collect()
		} else {
			vec![TokenTree::Ident(Ident::new(replacement_str, Span::call_site()))]
		};
		slots.push((check, Some(replacement_tokens)));

		result = replace_token_sequences_matching(result, &slots);
	}

	result
}
