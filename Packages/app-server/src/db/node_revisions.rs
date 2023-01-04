use deadpool_postgres::tokio_postgres::Row;
use rust_shared::anyhow::Error;
use rust_shared::SubError;
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json;
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Client};
use rust_shared::utils::type_aliases::JSONValue;

use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput, accessors::{AccessorContext, get_db_entry}}};

use super::_shared::access_policy_target::AccessPolicyTarget;
use super::node_phrasings::NodePhrasing;
use super::node_phrasings::NodePhrasing_Embedded;
use super::nodes::get_node;

pub async fn get_node_revision(ctx: &AccessorContext<'_>, id: &str) -> Result<NodeRevision, Error> {
    get_db_entry(ctx, "nodeRevisions", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

wrap_slow_macros!{

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "AttachmentInput")]
pub struct Attachment {
    pub equation: Option<JSONValue>,
    pub references: Option<JSONValue>,
    pub quote: Option<JSONValue>,
    pub media: Option<JSONValue>,
    //pub media: Option<MediaAttachment>,
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
pub struct NodeRevision {
    pub id: ID,
    pub creator: String,
    pub createdAt: i64,
    pub node: String,
    pub replacedBy: Option<String>, 
    pub phrasing: NodePhrasing_Embedded,
    #[graphql(name = "phrasing_tsvector")]
    #[serde(skip_serializing)] // makes-so when serializing the struct for saving to the db, this field is excluded (as it must be, since it's auto-generated)
    pub phrasing_tsvector: String,
    pub note: Option<String>,
    pub displayDetails: Option<JSONValue>,
    pub attachments: Vec<Attachment>,
    #[graphql(name = "c_accessPolicyTargets")]
    pub c_accessPolicyTargets: Vec<AccessPolicyTarget>,
}
impl NodeRevision {
    pub async fn with_access_policy_targets(self, ctx: &AccessorContext<'_>) -> Result<Self, Error> {
        let node = get_node(ctx, &self.node).await?;
        Ok(Self {
            c_accessPolicyTargets: vec![
                AccessPolicyTarget::new(node.accessPolicy, "nodes"),
            ],
            ..self
        })
    }
}
impl From<Row> for NodeRevision {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(InputObject, Clone, Serialize, Deserialize, Default)]
pub struct NodeRevisionInput {
    /// Marked as optional, since in some contexts it's not needed. (eg. for add_node, add_child_node, etc.)
    pub node: Option<String>,
    pub phrasing: NodePhrasing_Embedded,
    pub note: Option<String>,
    pub displayDetails: Option<JSONValue>,
    pub attachments: Vec<Attachment>,
}

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