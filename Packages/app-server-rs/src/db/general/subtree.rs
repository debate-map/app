use anyhow::Context;
use async_graphql::{Object, Result, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject};
use deadpool_postgres::Pool;
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future};
use hyper::{Body, Method};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio::sync::RwLock;
use tokio_postgres::{Client};
use std::path::Path;
use std::sync::Arc;
use std::{time::Duration, pin::Pin, task::Poll};

use crate::db::access_policies::AccessPolicy;
use crate::db::medias::Media;
use crate::db::node_child_links::NodeChildLink;
use crate::db::node_phrasings::MapNodePhrasing;
use crate::db::node_revisions::MapNodeRevision;
use crate::db::nodes::MapNode;
use crate::db::terms::Term;
use crate::proxy_to_asjs::{HyperClient, APP_SERVER_JS_URL};
use crate::utils::general::{handle_generic_gql_collection_request, GQLSet, handle_generic_gql_doc_request};
use crate::utils::filter::{Filter};
use crate::utils::type_aliases::{JSONValue};

use super::subtree_accessors::{SubtreeCollector, populate_subtree_collector, AccessorContext};

// queries
// ==========

wrap_slow_macros!{

#[derive(SimpleObject, Clone, Serialize, Deserialize, Default)]
pub struct Subtree {
    pub terms: Vec<Term>,
    pub medias: Vec<Media>,
    pub nodes: Vec<MapNode>,
    pub nodeChildLinks: Vec<NodeChildLink>,
    pub nodeRevisions: Vec<MapNodeRevision>,
    pub nodePhrasings: Vec<MapNodePhrasing>,
}

#[derive(Default)]
pub struct QueryShard_General_Subtree;
#[Object]
impl QueryShard_General_Subtree {
    async fn subtree(&self, ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Subtree> {
        //let client = &mut ctx.data::<Client>().unwrap();
        let pool = ctx.data::<Pool>().unwrap();
        let mut client = pool.get().await.unwrap();

        let tx = client.build_transaction()
            //.isolation_level(tokio_postgres::IsolationLevel::Serializable).start().await?;
            // use with serializable+deferrable+readonly, so that the transaction is guaranteed to not fail (see doc for "deferrable") [there may be a better way] 
            .isolation_level(tokio_postgres::IsolationLevel::Serializable).deferrable(true).read_only(true)
            .start().await?;

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

}