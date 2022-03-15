use std::{env};
use proc_macro2::{TokenStream, TokenTree, Group, Delimiter};

use crate::utils::remove_token_sequences_matching;

// test-approach, of just stripping all the async-graphql macros for cargo-check (since presumably not needed at that point)
// ==========

pub fn wrap_async_graphql_impl(input: TokenStream, force_proceed: bool) -> TokenStream {
    let proceed = force_proceed || {
        let mut temp = false;
        if let Ok(val) = env::var("STRIP_ASYNC_GRAPHQL") {
            if val == "1" {
                println!("Macro wrap_async_graphql: Modifying tokens, since STRIP_ASYNC_GRAPHQL is true.");
                temp = true;
            }
        }
        temp
    };
    if !proceed {
        return input;
    }
    
    let output = input.clone();
    let output = remove_graphql_tags(output);
    output
}

static MACROS_TO_REMOVE: &'static [&'static str] = &["graphql", "Object", "Subscription"];
static DERIVE_MACROS_TO_REMOVE: &'static [&'static str] = &["SimpleObject", "MergedObject", "MergedSubscription"];
fn remove_graphql_tags(tokens: TokenStream) -> TokenStream {
    let is_macro_to_block = Box::new(|token: &TokenTree| {
        match token {
            TokenTree::Group(data) => {
                if data.delimiter() == Delimiter::Bracket {
                    let children: Vec<TokenTree> = data.stream().into_iter().collect();
                    if let Some(first_child) = children.get(0) {
                        if let TokenTree::Ident(data) = first_child {
                            if MACROS_TO_REMOVE.contains(&data.to_string().as_str()) {
                                return true;
                            }
                        }
                    }
                }
                false
            },
            _ => false,
        }
    });
    let is_hash = Box::new(|token: &TokenTree| {
        match token {
            TokenTree::Punct(data) if data.as_char() == '#' => true,
            _ => false,
        }
    });
    
    let result = remove_token_sequences_matching(tokens, vec![
        is_hash,
        is_macro_to_block,
    ]);

    let is_derive_macro_to_block = Box::new(|token: &TokenTree| {
        match token {
            TokenTree::Ident(data) if DERIVE_MACROS_TO_REMOVE.contains(&data.to_string().as_str()) => true,
            _ => false,
        }
    });
    let is_comma = Box::new(|token: &TokenTree| {
        match token {
            TokenTree::Punct(data) if data.as_char() == ',' => true,
            _ => false
        }
    });

    // first remove any target-macros, matching pattern: `MACRO,` (ie. non-last derive-macro)
    let result = remove_token_sequences_matching(result, vec![
        is_derive_macro_to_block.clone(),
        is_comma.clone(),
    ]);
    // then remove any target-macros, matching pattern: `,MACRO` (ie. non-first derive-macro)
    let result = remove_token_sequences_matching(result, vec![
        is_comma.clone(),
        is_derive_macro_to_block.clone(),
    ]);
    // then remove any target-macros, matching pattern: `MACRO` (ie. standalone derive-macro)
    let result = remove_token_sequences_matching(result, vec![
        is_derive_macro_to_block.clone(),
    ]);
    result
}



// tests (run these with "cargo test -- --nocapture" to see log output)
// ==========

#[cfg(test)]
mod tests {
    use std::str::FromStr;
    use proc_macro2::TokenStream;

    use crate::wrap_async_graphql::remove_graphql_tags;

    #[test]
    fn test1() {
        let tokens = TokenStream::from_str(r#"
            #[Object]
            struct Test1 {
                #[graphql(name = "public_base")]
                public_base: bool;
            }

            #[derive(MergedObject, Default)]
            pub struct QueryRoot;
            #[derive(MergedSubscription, Default)]
            pub struct SubscriptionRoot;

            #[SimpleObject]
            struct Test2 {}

            #[Subscription]
            impl SubscriptionShard_CommandRun {}
        "#);
        println!("Tokens:{:#?}", tokens);
        /* output:
        ==========
        Tokens:Ok(TokenStream [
            Punct { char: '#', spacing: Alone },
            Group { delimiter: Bracket, stream: TokenStream [
                Ident { sym: Object },
            ] },
            Ident { sym: struct },
            Ident { sym: Test1 },
            Group { delimiter: Brace, stream: TokenStream [
                Punct { char: '#', spacing: Alone },
                Group { delimiter: Bracket, stream: TokenStream [
                    Ident { sym: graphql },
                    Group { delimiter: Parenthesis, stream: TokenStream [
                        Ident { sym: name },
                        Punct { char: '=', spacing: Alone },
                        Literal { lit: "public_base" },
                    ] },
                ] },
                Ident { sym: public_base },
                Punct { char: ':', spacing: Alone },
                Ident { sym: bool, },
                Punct { char: ';', spacing: Alone },
            ]},
            Punct { char: '#', spacing: Alone },
            Group { delimiter: Bracket, stream: TokenStream [
                Ident { sym: derive },
                Group { delimiter: Parenthesis, stream: TokenStream [
                    Ident { sym: MergedObject },
                    Punct { char: ',', spacing: Alone },
                    Ident { sym: Default },
                ] },
            ] },
            Ident { sym: pub },
            Ident { sym: struct },
            Ident { sym: QueryRoot },
            Punct { char: ';', spacing: Alone },
            Punct { char: '#', spacing: Alone },
            Group { delimiter: Bracket, stream: TokenStream [
                Ident { sym: derive },
                Group { delimiter: Parenthesis, stream: TokenStream [
                    Ident { sym: MergedSubscription },
                    Punct { char: ',', spacing: Alone },
                    Ident { sym: Default },
                ] },
            ] },
            Ident { sym: pub },
            Ident { sym: struct },
            Ident { sym: SubscriptionRoot },
            Punct { char: ';', spacing: Alone },
            Punct { char: '#', spacing: Alone },
            Group { delimiter: Bracket, stream: TokenStream [
                Ident { sym: SimpleObject },
            ] },
            Ident { sym: struct },
            Ident { sym: Test2 },
            Group { delimiter: Brace, stream: TokenStream [] },
            Punct { char: '#', spacing: Alone },
            Group { delimiter: Bracket, stream: TokenStream [
                Ident { sym: Subscription },
            ] },
            Ident { sym: impl },
            Ident { sym: SubscriptionShard_CommandRun },
            Group { delimiter: Brace, stream: TokenStream [] },
        ])*/
    }

    #[test]
    fn filter_out_graphql() {
        let tokens = TokenStream::from_str(r#"
            #[Object]
            struct Test1 {
                #[graphql(name = "public_base")]
                public_base: bool;
                #[some_other_macro]
                public_base2: bool;
            }

            #[derive(MergedObject, Default)]
            pub struct QueryRoot;
            #[derive(MergedSubscription, Default)]
            pub struct SubscriptionRoot;
    
            #[derive(SimpleObject)]
            struct Test2 {}
    
            #[Subscription]
            impl SubscriptionShard_CommandRun {}
        "#).unwrap();
        let tokens_filtered = remove_graphql_tags(tokens);
        assert_eq!(
            tokens_filtered.to_string().chars().filter(|c| !c.is_whitespace()).collect::<String>(),
            r##"
                struct Test1 {
                    public_base: bool;
                    #[some_other_macro]
                    public_base2: bool;
                }

                #[derive(Default)]
                pub struct QueryRoot;
                #[derive(Default)]
                pub struct SubscriptionRoot;
    
                #[derive()]
                struct Test2 {}
    
                impl SubscriptionShard_CommandRun {}
            "##.chars().filter(|c| !c.is_whitespace()).collect::<String>()
        );
    }
}