use jsonschema::JSONSchema;
use jsonschema::output::BasicOutput;
use lazy_static::lazy_static;
use rust_shared::anyhow::{anyhow, Context, Error};
use rust_shared::async_graphql::{Object, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject, InputObject, self, Enum};
use deadpool_postgres::{Pool, Client, Transaction};
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future, TryStreamExt};
use rust_shared::hyper::{Body, Method};
use rust_shared::once_cell::sync::Lazy;
use rust_shared::regex::Regex;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio::sync::{RwLock, Semaphore};
use rust_shared::tokio_postgres::Row;
use rust_shared::utils::general_::extensions::IteratorV;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{serde, GQLError};
use std::collections::HashSet;
use std::path::Path;
use std::rc::Rc;
use std::sync::Arc;
use std::{time::Duration, pin::Pin, task::Poll};

use crate::db::_general::GenericMutation_Result;
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
use crate::utils::{db::{generic_handlers::{subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet}}}};
use crate::utils::type_aliases::{PGClientObject};
use crate::utils::db::accessors::{AccessorContext};

use super::subtree_collector::{get_node_subtree, params, get_node_subtree2};

wrap_slow_macros!{

// queries
// ==========

#[derive(InputObject, Serialize, Deserialize)]
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

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum ExternalIdType {
	#[graphql(name = "claimMiner")] claimMiner,
	#[graphql(name = "hypothesisAnnotation")] hypothesisAnnotation,
}
#[derive(InputObject, Serialize, Deserialize)]
pub struct SearchForExternalIdsInput {
    id_type: ExternalIdType,
    ids: Vec<String>
}
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct SearchForExternalIdsResult {
    found_ids: Vec<String>,
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

        let rows = {
            // use semaphore, so that only X threads can be executing search queries (in `search_globally` or `search_subtree`) at the same time
            let _permit = SEMAPHORE__SEARCH_EXECUTION.acquire().await.unwrap();
            let mut anchor = DataAnchorFor1::empty(); // holds pg-client
            let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;
            let rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT * from global_search($1, $2, $3, $4, $5)"#, params(&[
                &query, &search_limit_i32, &search_offset_i32, &alt_phrasing_rank_factor_f64, &quote_rank_factor_f64,
            ])).await?.try_collect().await?;
            rows
        };
        
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

        let rows = {
            // use semaphore, so that only X threads can be executing search queries (in `search_globally` or `search_subtree`) at the same time
            let _permit = SEMAPHORE__SEARCH_EXECUTION.acquire().await.unwrap();
            let mut anchor = DataAnchorFor1::empty(); // holds pg-client
            let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;
            let rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT * from local_search($1, $2, $3, $4, $5, $6, $7)"#, params(&[
                &root_node_id, &query, &search_limit_i32, &search_offset_i32, &max_depth_i32, &quote_rank_factor_f64, &alt_phrasing_rank_factor_f64
            ])).await?.try_collect().await?;
            rows
        };

        let search_results: Vec<SearchSubtreeResult> = rows.into_iter().map(|a| a.into()).collect();
        Ok(search_results)
    }

    // Commented; Henceforth, I plan to consider acronyms/abbreviations as "normal" words, ie. only its first letter is capitalized, because:
    // 1 [abstract]) This is arguably more consistent/unambigious. Some examples:
    // * Example1) Does the snake-cased "some_xyz_field" convert to camel-case as "someXyzField" or "someXYZField"? With new casing system, this is algorithmically clear -- versus the old approach, which requires human input.
    // * Example2) Does the pascal-case "APDFFile" convert to camel-case as "aPDFFile" or "apdfFile"? (admittedly an extreme edge-case of the first "word" being a single letter)
    // 2 [practical]) This removes the need to do these casing-overrides for async-graphql.
    // For now, we'll say it only necessarily applies to Rust code (since the JS code is filled with the other casing choice), but the JS code may ultimately switch fully as well.
    //#[graphql(name = "searchForExternalIDs")]
    async fn search_for_external_ids(&self, gql_ctx: &async_graphql::Context<'_>, input: SearchForExternalIdsInput) -> Result<SearchForExternalIdsResult, GQLError> {
        let SearchForExternalIdsInput { id_type, ids: ids_unsafe } = input;
        let id_field = match id_type {
            ExternalIdType::claimMiner => "claimMinerId",
            ExternalIdType::hypothesisAnnotation => "hypothesisAnnotationId",
        };
        static REGEX_FOR_VALID_ID_CHARS: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[\w\-_\+/=:@\|%]+$").unwrap());
        // throw error if any ids don't match the regex (can be important, since "search_for_external_ids" sql-function currently uses the ids for a concat->jsonb operation)
        let ids = ids_unsafe.into_iter().map(|id| match REGEX_FOR_VALID_ID_CHARS.is_match(&id) {
            true => Ok(id),
            false => Err(anyhow!("Invalid id: {}", id)),
        }).try_collect2::<Vec<_>>()?;

        let rows = {
            //let _permit = SEMAPHORE__SEARCH_EXECUTION.acquire().await.unwrap(); // semaphore not needed, since query fast enough
            let mut anchor = DataAnchorFor1::empty(); // holds pg-client
            // For this query, bypass rls-checks. It appears safe, and brings major speed-gains (presumably since can use index): with bypass-rls=false, takes ~3000ms; with bypass-rls=true, takes <100ms
            let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, true).await?;
            let rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT * from search_for_external_ids($1, $2)"#, params(&[
                &id_field, &ids,
            ])).await?.try_collect().await?;
            rows
        };
        
        let result = SearchForExternalIdsResult {
            found_ids: rows.into_iter().map(|a| a.get(0)).collect(),
        };
        Ok(result)
    }
}

}

// limit the number of searches that are being executed at the same time (we don't want expensive searches to drown out other requests, such as live-query execution)
pub static SEMAPHORE__SEARCH_EXECUTION: Lazy<Semaphore> = Lazy::new(|| Semaphore::new(get_search_execution_concurrency_limit()));
fn get_search_execution_concurrency_limit() -> usize {
    //let logical_cpus = num_cpus::get();
    2
}