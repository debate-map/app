use jsonschema::JSONSchema;
use jsonschema::output::BasicOutput;
use lazy_static::lazy_static;
use rust_shared::anyhow::{anyhow, Context, Error};
use rust_shared::async_graphql::{Object, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject, InputObject, self};
use deadpool_postgres::{Pool, Client, Transaction};
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future, TryStreamExt};
use rust_shared::hyper::{Body, Method};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio::sync::RwLock;
use rust_shared::tokio_postgres::Row;
use rust_shared::{serde, GQLError};
use std::collections::HashSet;
use std::path::Path;
use std::rc::Rc;
use std::sync::Arc;
use std::{time::Duration, pin::Pin, task::Poll};

use crate::db::_general::GenericMutation_Result;
use crate::db::access_policies::AccessPolicy;
use crate::db::commands::clone_subtree::clone_subtree;
use crate::db::medias::Media;
use crate::db::node_links::NodeLink;
use crate::db::node_phrasings::NodePhrasing;
use crate::db::node_tags::NodeTag;
use crate::db::terms::Term;
use crate::utils::db::filter::{QueryFilter, FilterInput};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::db::sql_fragment::SQLFragment;
use crate::utils::db::transactions::start_read_transaction;
use crate::utils::general::data_anchor::{DataAnchorFor1, DataAnchor};
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}}};
use crate::utils::type_aliases::{PGClientObject};
use crate::utils::db::accessors::{AccessorContext};

use super::subtree_collector::{get_node_subtree, params, get_node_subtree2};

wrap_slow_macros!{

// queries
// ==========

#[derive(InputObject, Deserialize)]
pub struct SearchGloballyInput {
    query: String,
    search_limit: usize,
    search_offset: Option<usize>,
    alt_phrasing_rank_factor: Option<f64>,
    quote_rank_factor: Option<f64>,
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct SearchGloballyResult {
    node_id: String,
    rank: f64,
    r#type: String,
    found_text: String,
    node_text: String,
}
impl From<Row> for SearchGloballyResult {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct SearchSubtreeResult {
    node_id: String,
    rank: f64,
    r#type: String,
    found_text: String,
    node_text: String,
}
impl From<Row> for SearchSubtreeResult {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(Default)]
pub struct QueryShard_General_Search;
#[Object]
impl QueryShard_General_Search {
    async fn search_globally(&self, gql_ctx: &async_graphql::Context<'_>, input: SearchGloballyInput) -> Result<Vec<SearchGloballyResult>, GQLError> {
        let SearchGloballyInput { query, search_limit, search_offset, alt_phrasing_rank_factor, quote_rank_factor } = input;
        let search_limit_i32 = search_limit as i32;
        let search_offset_i32 = search_offset.unwrap_or(0) as i32;
        let alt_phrasing_rank_factor_f64 = alt_phrasing_rank_factor.unwrap_or(0.95) as f64;
        let quote_rank_factor_f64 = quote_rank_factor.unwrap_or(0.9) as f64;
        
        let mut anchor = DataAnchorFor1::empty(); // holds pg-client
        let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;

        let rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT * from global_search($1, $2, $3, $4, $5)"#, params(&[
            &query, &search_limit_i32, &search_offset_i32, &alt_phrasing_rank_factor_f64, &quote_rank_factor_f64,
        ])).await?.try_collect().await?;
        let search_results: Vec<SearchGloballyResult> = rows.into_iter().map(|a| a.into()).collect();
        Ok(search_results)
    }

    async fn search_subtree(
        &self, gql_ctx: &async_graphql::Context<'_>,
        root_node_id: String, max_depth: Option<usize>, query: String,
        search_limit: usize, search_offset: Option<usize>,
        alt_phrasing_rank_factor: Option<f64>, quote_rank_factor: Option<f64>,
    ) -> Result<Vec<SearchSubtreeResult>, GQLError> {
        let max_depth_i32 = max_depth.unwrap_or(10000) as i32;
        let search_limit_i32 = search_limit as i32;
        let search_offset_i32 = search_offset.unwrap_or(0) as i32;
        let alt_phrasing_rank_factor_f64 = alt_phrasing_rank_factor.unwrap_or(0.95) as f64;
        let quote_rank_factor_f64 = quote_rank_factor.unwrap_or(0.9) as f64;

        let mut anchor = DataAnchorFor1::empty(); // holds pg-client
        let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;

        let rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT * from local_search($1, $2, $3, $4, $5, $6, $7)"#, params(&[
            &root_node_id, &query, &search_limit_i32, &search_offset_i32, &max_depth_i32, &quote_rank_factor_f64, &alt_phrasing_rank_factor_f64
        ])).await?.try_collect().await?;
        let search_results: Vec<SearchSubtreeResult> = rows.into_iter().map(|a| a.into()).collect();
        Ok(search_results)
    }
}

}