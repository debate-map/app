use proc_macro2::{Delimiter, Group, TokenStream, TokenTree};
use std::collections::HashMap;

// level-2 helpers
// ==========

pub fn remove_token_sequences_for_macros(tokens: TokenStream, macros_to_remove: &'static [&'static str]) -> TokenStream {
	remove_token_sequences_matching(tokens, get_slot_checks_for_removing_macros(macros_to_remove))
}
pub fn get_slot_checks_for_removing_macros(macros_to_remove: &'static [&'static str]) -> Vec<SlotCheck> {
	let is_macro_to_block = Box::new(|token: &TokenTree| match token {
		TokenTree::Group(data) => {
			if data.delimiter() == Delimiter::Bracket {
				let children: Vec<TokenTree> = data.stream().into_iter().collect();
				if let Some(first_child) = children.get(0) {
					if let TokenTree::Ident(data) = first_child {
						if macros_to_remove.contains(&data.to_string().as_str()) {
							return true;
						}
					}
				}
			}
			false
		},
		_ => false,
	});
	let is_hash = Box::new(|token: &TokenTree| match token {
		TokenTree::Punct(data) if data.as_char() == '#' => true,
		_ => false,
	});

	vec![is_hash, is_macro_to_block]
}

pub fn remove_token_sequences_for_derive_macros(tokens: TokenStream, derive_macros_to_remove: &'static [&'static str]) -> TokenStream {
	let result = tokens;

	let is_derive_macro_to_block = Box::new(|token: &TokenTree| match token {
		TokenTree::Ident(data) if derive_macros_to_remove.contains(&data.to_string().as_str()) => true,
		_ => false,
	});
	let is_comma = Box::new(|token: &TokenTree| match token {
		TokenTree::Punct(data) if data.as_char() == ',' => true,
		_ => false,
	});

	// first remove any target-macros, matching pattern: `MACRO,` (ie. non-last derive-macro)
	let result = remove_token_sequences_matching(result, vec![is_derive_macro_to_block.clone(), is_comma.clone()]);
	// then remove any target-macros, matching pattern: `,MACRO` (ie. non-first derive-macro)
	let result = remove_token_sequences_matching(result, vec![is_comma.clone(), is_derive_macro_to_block.clone()]);
	// then remove any target-macros, matching pattern: `MACRO` (ie. standalone derive-macro)
	let result = remove_token_sequences_matching(result, vec![is_derive_macro_to_block.clone()]);

	result
}

// level-1 helpers (token-modification functions)
// ==========

pub fn remove_token_sequences_matching(tokens: TokenStream, mut slot_checks: Vec<SlotCheck>) -> TokenStream {
	let mut slots: Vec<Slot> = Vec::new();
	for check in slot_checks.drain(0..slot_checks.len()) {
		slots.push((check, None));
	}
	replace_token_sequences_matching(tokens, &slots)
}

pub type Slot = (SlotCheck, SlotReplacement);
pub type SlotCheck = Box<dyn Fn(&TokenTree) -> bool>;
pub type SlotReplacement = Option<Vec<TokenTree>>;
pub fn replace_token_sequences_matching(tokens: TokenStream, slots: &Vec<Slot>) -> TokenStream {
	let mut token_replacements_planned: HashMap<usize, SlotReplacement> = HashMap::new();

	let mut tokens_so_far = Vec::new();
	for token in tokens {
		//println!("Processing token:{}", token.to_string());
		tokens_so_far.push(token);
		if tokens_so_far.len() >= slots.len() {
			let token_index_for_first_slot = tokens_so_far.len() - slots.len();
			let all_checks_pass = slots.iter().enumerate().all(|(i, slot)| {
				let token = &tokens_so_far[token_index_for_first_slot + i];
				let check = &slot.0;
				return check(token);
			});
			if all_checks_pass {
				//println!("Blocking this token, and the {} before it.", tokens_for_slots.len() - 1);
				for (i2, slot) in slots.iter().enumerate() {
					let index_to_replace = token_index_for_first_slot + i2;
					token_replacements_planned.insert(index_to_replace, slot.1.clone());
				}
			}
		}
	}

	let mut result: Vec<TokenTree> = Vec::new();
	for (i, token) in tokens_so_far.into_iter().enumerate() {
		if token_replacements_planned.contains_key(&i) {
			let replace_with = token_replacements_planned.remove(&i).unwrap(); // remove the entry from the hash-map while retrieving
			if let Some(mut replace_with) = replace_with {
				result.append(&mut replace_with);
			}
			continue;
		}
		result.push(token);
	}

	#[rustfmt::skip]
    let result_processed: Vec<TokenTree> = result.into_iter().map(|token| {
        match token {
            TokenTree::Group(data) => {
                let new_stream = replace_token_sequences_matching(data.stream(), &slots);
                TokenTree::Group(Group::new(data.delimiter(), new_stream))
            },
            _ => token,
        }
    }).collect();

	TokenStream::from_iter(result_processed)
}
