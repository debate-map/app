use std::{collections::HashMap};
use proc_macro2::{TokenStream, TokenTree, Group};

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