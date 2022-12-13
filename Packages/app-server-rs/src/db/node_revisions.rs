use rust_shared::anyhow::Error;
use rust_shared::SubError;
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::db::node_revisions::NodeRevision;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Client};

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput, accessors::{AccessorContext, get_db_entry}}};

pub async fn get_node_revision(ctx: &AccessorContext<'_>, id: &str) -> Result<NodeRevision, Error> {
    get_db_entry(ctx, "nodeRevisions", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

wrap_slow_macros!{

/*#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct MediaAttachment {
    pub id: string,
    /// whether the image/video is claimed to be a capturing of real-world footage
	pub captured: boolean,
    /// used to limit the display-width, eg. to keep a tall-but-skinny image from extending multiple screens down
	pub previewWidth: Option<f64>,
	pub sourceChains: SourceChain[],
}*/

#[derive(Clone)] pub struct GQLSet_NodeRevision { nodes: Vec<NodeRevision> }
#[Object] impl GQLSet_NodeRevision { async fn nodes(&self) -> &Vec<NodeRevision> { &self.nodes } }
impl GQLSet<NodeRevision> for GQLSet_NodeRevision {
    fn from(entries: Vec<NodeRevision>) -> GQLSet_NodeRevision { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<NodeRevision> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_NodeRevision;
#[Subscription]
impl SubscriptionShard_NodeRevision {
    async fn nodeRevisions<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_NodeRevision, SubError>> + 'a {
        handle_generic_gql_collection_request::<NodeRevision, GQLSet_NodeRevision>(ctx, "nodeRevisions", filter).await
    }
    async fn nodeRevision<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<NodeRevision>, SubError>> + 'a {
        handle_generic_gql_doc_request::<NodeRevision>(ctx, "nodeRevisions", id).await
    }
}

}