use cached_expand::cached_expand_impl;
use proc_macro2::TokenStream;
use wrap_agql_schema_build::wrap_agql_schema_build_impl;
use wrap_async_graphql::wrap_async_graphql_impl;

extern crate proc_macro;
extern crate syn;

mod cached_expand;
mod wrap_async_graphql;
mod wrap_agql_schema_build;

#[proc_macro]
pub fn cached_expand(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let output = cached_expand_impl(TokenStream::from(input));
    proc_macro::TokenStream::from(output)
}

#[proc_macro]
pub fn wrap_async_graphql(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let output = wrap_async_graphql_impl(TokenStream::from(input));
    proc_macro::TokenStream::from(output)
}

#[proc_macro]
pub fn wrap_agql_schema_build(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let output = wrap_agql_schema_build_impl(TokenStream::from(input));
    proc_macro::TokenStream::from(output)
}