use jsonschema::JSONSchema;
use jsonschema::output::BasicOutput;
use lazy_static::lazy_static;
use anyhow::{anyhow, Context, Error};
use async_graphql::{Object, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject};
use deadpool_postgres::{Pool, Client, Transaction};
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future, TryStreamExt};
use hyper::{Body, Method};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio::sync::RwLock;
use tokio_postgres::Row;
use std::collections::HashSet;
use std::path::Path;
use std::rc::Rc;
use std::sync::Arc;
use std::{time::Duration, pin::Pin, task::Poll};

use crate::db::_general::GenericMutation_Result;
use crate::db::access_policies::AccessPolicy;
use crate::db::commands::clone_subtree::clone_subtree;
use crate::db::medias::Media;
use crate::db::node_child_links::NodeChildLink;
use crate::db::node_phrasings::MapNodePhrasing;
use crate::db::node_revisions::MapNodeRevision;
use crate::db::node_tags::MapNodeTag;
use crate::db::nodes::MapNode;
use crate::db::terms::Term;
use crate::links::proxy_to_asjs::{HyperClient, APP_SERVER_JS_URL};
use crate::utils::db::filter::{QueryFilter, FilterInput};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::db::pg_stream_parsing::RowData;
use crate::utils::db::sql_fragment::SQLFragment;
use crate::utils::db::transactions::start_read_transaction;
use crate::utils::general::data_anchor::{DataAnchorFor1, DataAnchor};
use crate::utils::general::general::to_anyhow;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}}};
use crate::utils::type_aliases::{JSONValue, PGClientObject};
use crate::utils::db::accessors::{AccessorContext};

use super::subtree_collector::{get_node_subtree, params};

wrap_slow_macros!{

// queries
// ==========

#[derive(SimpleObject, Clone, Serialize, Deserialize, Default)]
pub struct Subtree {
    pub terms: Vec<Term>,
    pub medias: Vec<Media>,
    pub nodes: Vec<MapNode>,
    pub nodeChildLinks: Vec<NodeChildLink>,
    pub nodeRevisions: Vec<MapNodeRevision>,
    pub nodePhrasings: Vec<MapNodePhrasing>,
    pub nodeTags: Vec<MapNodeTag>,
}
impl Subtree {
    pub fn get_all_ids(&self) -> HashSet<String> {
        let mut result = HashSet::<String>::new();
        for entry in &self.terms { result.insert(entry.id.to_string()); }
        for entry in &self.medias { result.insert(entry.id.to_string()); }
        for entry in &self.nodes { result.insert(entry.id.to_string()); }
        for entry in &self.nodeChildLinks { result.insert(entry.id.to_string()); }
        for entry in &self.nodeRevisions { result.insert(entry.id.to_string()); }
        for entry in &self.nodePhrasings { result.insert(entry.id.to_string()); }
        for entry in &self.nodeTags { result.insert(entry.id.to_string()); }
        result
    }
    pub fn sort_all_entries(&mut self) {
        // see here for reason sort_by_key isn't used: https://stackoverflow.com/a/47126516
        //self.terms.sort_by_key(|a| &a.id);
        self.terms.sort_by(|x, y| x.id.cmp(&y.id));
        self.medias.sort_by(|x, y| x.id.cmp(&y.id));
        self.nodes.sort_by(|x, y| x.id.cmp(&y.id));
        self.nodeChildLinks.sort_by(|x, y| x.id.cmp(&y.id));
        self.nodeRevisions.sort_by(|x, y| x.id.cmp(&y.id));
        self.nodePhrasings.sort_by(|x, y| x.id.cmp(&y.id));
        self.nodeTags.sort_by(|x, y| x.id.cmp(&y.id));
    }
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Descendant {
    id: String,
    distance: i32,
}
impl From<tokio_postgres::row::Row> for Descendant {
    fn from(row: tokio_postgres::row::Row) -> Self { postgres_row_to_struct(row) }
}
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Ancestor {
    id: String,
    distance: i32,
}
impl From<tokio_postgres::row::Row> for Ancestor {
    fn from(row: tokio_postgres::row::Row) -> Self { postgres_row_to_struct(row) }
}

#[derive(Default)]
pub struct QueryShard_General_Subtree;
#[Object]
impl QueryShard_General_Subtree {
    async fn subtree(&self, gql_ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Subtree, Error> {
        let mut anchor = DataAnchorFor1::empty(); // holds pg-client
        let tx = start_read_transaction(&mut anchor, gql_ctx).await?;
        let ctx = AccessorContext::new(tx);

        let subtree = get_node_subtree(&ctx, root_node_id, max_depth.unwrap_or(10000)).await?;

        Ok(subtree)
    }

    // lower-level functions
    async fn descendants(&self, gql_ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Vec<Descendant>, Error> {
        let mut anchor = DataAnchorFor1::empty(); // holds pg-client
        let tx = start_read_transaction(&mut anchor, gql_ctx).await?;
        let ctx = AccessorContext::new(tx);
        let max_depth_i32 = max_depth.unwrap_or(10000) as i32;

        let rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT * from descendants($1, $2)"#, params(&[&root_node_id, &max_depth_i32])).await?.try_collect().await?;
        let descendants: Vec<Descendant> = rows.into_iter().map(|a| a.into()).collect();
        Ok(descendants)
    }
    async fn ancestors(&self, gql_ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Vec<Ancestor>, Error> {
        let mut anchor = DataAnchorFor1::empty(); // holds pg-client
        let tx = start_read_transaction(&mut anchor, gql_ctx).await?;
        let ctx = AccessorContext::new(tx);
        let max_depth_i32 = max_depth.unwrap_or(10000) as i32;

        let rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT * from ancestors($1, $2)"#, params(&[&root_node_id, &max_depth_i32])).await?.try_collect().await?;
        let ancestors: Vec<Ancestor> = rows.into_iter().map(|a| a.into()).collect();
        Ok(ancestors)
    }
}

// mutations
// ==========

#[derive(Default)]
pub struct MutationShard_General_Subtree;
#[Object]
impl MutationShard_General_Subtree {
    async fn cloneSubtree(&self, gql_ctx: &async_graphql::Context<'_>, payload: JSONValue) -> Result<GenericMutation_Result, Error> {
        let result = clone_subtree(gql_ctx, payload).await?;
        Ok(result)
    }
}

}