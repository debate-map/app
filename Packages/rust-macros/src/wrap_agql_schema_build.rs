use std::{env};
use std::str::FromStr;
use proc_macro2::{TokenStream};

use crate::wrap_async_graphql::SKIP_AGQL_WRAPPING;

/// Only needed to be used if you need to have the `Schema<X, Y, Z>` type present.
/// 
/// Usage example:
/// ```
/// pub type RootSchema = wrap_agql_schema_type!{
///     Schema<QueryRoot, MutationRoot, SubscriptionRoot>
/// };
/// ```
pub fn wrap_agql_schema_type_impl(input: TokenStream, force_proceed: bool) -> TokenStream {
    if SKIP_AGQL_WRAPPING { return input; } // can set this flag to true temporarily, to make debugging easier

    let proceed = force_proceed || {
        let mut temp = false;
        if let Ok(val) = env::var("STRIP_ASYNC_GRAPHQL") {
            if val == "1" {
                println!("Macro wrap_agql_schema_type: Modifying tokens, since STRIP_ASYNC_GRAPHQL is true.");
                temp = true;
            }
        }
        temp
    };
    if !proceed {
        return input;
    }
    
    return TokenStream::from_str(r#"
        Schema<EmptyMutation, EmptyMutation, EmptySubscription>
    "#).unwrap();
}

pub fn wrap_agql_schema_build_impl(input: TokenStream, force_proceed: bool) -> TokenStream {
    if SKIP_AGQL_WRAPPING { return input; } // can set this flag to true temporarily, to make debugging easier

    let proceed = force_proceed || {
        let mut temp = false;
        if let Ok(val) = env::var("STRIP_ASYNC_GRAPHQL") {
            if val == "1" {
                println!("Macro wrap_agql_scheme_build: Modifying tokens, since STRIP_ASYNC_GRAPHQL is true.");
                temp = true;
            }
        }
        temp
    };
    if !proceed {
        return input;
    }
    
    return TokenStream::from_str(r#"
        Schema::build(EmptyMutation, EmptyMutation, EmptySubscription)
    "#).unwrap();
}