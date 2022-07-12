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
use crate::utils::db::pg_stream_parsing::RowData;
use crate::utils::db::sql_fragment::SQLFragment;
use crate::utils::db::sql_param::SQLIdent;
use crate::utils::db::transactions::start_read_transaction;
use crate::utils::general::data_anchor::{DataAnchorFor1, DataAnchor};
use crate::utils::general::general::to_anyhow;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}}};
use crate::utils::type_aliases::{JSONValue, PGClientObject};
use crate::utils::db::accessors::{AccessorContext};

use super::subtree_collector::{SubtreeCollector, populate_subtree_collector};

pub async fn get_subtree(ctx: &AccessorContext<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Subtree, Error> {
    let collector = SubtreeCollector::default();
    let root_path_segments = vec![root_node_id.clone()];
    let collector_arc = Arc::new(RwLock::new(collector));
    populate_subtree_collector(&ctx, root_node_id, max_depth.unwrap_or(usize::MAX), &root_path_segments, collector_arc.clone()).await?;

    let arc_clone = collector_arc.clone();
    let collector = arc_clone.read().await;
    let subtree = collector.to_subtree();
    Ok(subtree)
}

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
}

#[derive(Default)]
pub struct QueryShard_General_Subtree;
#[Object]
impl QueryShard_General_Subtree {
    async fn subtree(&self, gql_ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Subtree, Error> {
        let mut anchor = DataAnchorFor1::empty(); // holds pg-client
        let tx = start_read_transaction(&mut anchor, gql_ctx).await?;
        let ctx = AccessorContext::new(tx);

        let collector = SubtreeCollector::default();
        let root_path_segments = vec![root_node_id.clone()];
        let collector_arc = Arc::new(RwLock::new(collector));
        populate_subtree_collector(&ctx, root_node_id, max_depth.unwrap_or(usize::MAX), &root_path_segments, collector_arc.clone()).await?;

        let arc_clone = collector_arc.clone();
        let collector = arc_clone.read().await;
        let subtree = collector.to_subtree();

        Ok(subtree)
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