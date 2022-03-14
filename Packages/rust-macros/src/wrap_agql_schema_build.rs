use std::{env};
use std::str::FromStr;
use proc_macro2::{TokenStream};

pub fn wrap_agql_schema_build_impl(input: TokenStream) -> TokenStream {
    let proceed = {
        let mut temp = false;
        // if this macro is running as part of the "cargo expand" command (of a parent instance of this macro), then...
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
    
    return TokenStream::from_str(r#"
        Schema::build(EmptyMutation, EmptyMutation, EmptySubscription)
    "#).unwrap();
}