use rust_shared::anyhow::Error;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{SubError, serde_json, GQLError};
use rust_shared::async_graphql::{self, Enum};
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::db::generic_handlers::queries::{handle_generic_gql_doc_query, handle_generic_gql_collection_query};
use crate::utils::{db::{generic_handlers::{subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet}}, filter::FilterInput}};

use crate::utils::db::accessors::{get_db_entry, AccessorContext, get_db_entries};

use super::_shared::access_policy_target::AccessPolicyTarget;
use super::_shared::attachments::TermAttachment;
use super::commands::_command::{CanNullOrOmit, CanOmit};
use super::nodes::get_node;

pub async fn get_node_phrasing(ctx: &AccessorContext<'_>, id: &str) -> Result<NodePhrasing, Error> {
    get_db_entry(ctx, "nodePhrasings", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
pub async fn get_node_phrasings(ctx: &AccessorContext<'_>, node_id: &str) -> Result<Vec<NodePhrasing>, Error> {
    get_db_entries(ctx, "nodePhrasings", &Some(json!({
        "node": {"equalTo": node_id}
    }))).await
}

wrap_slow_macros!{

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum NodePhrasingType {
    #[graphql(name = "standard")] standard,
    #[graphql(name = "simple")] simple,
    #[graphql(name = "technical")] technical,
    #[graphql(name = "humor")] humor,
    #[graphql(name = "web")] web,
}

/// Variant of NodePhrasing struct that keeps only the fields relevant for phrasings that are "embedded" within a node-revision.
#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize, Default)]
#[graphql(input_name = "NodePhrasingEmbeddedInput")]
//#[graphql(name = "NodePhrasing_Embedded", input_name = "NodePhrasing_EmbeddedInput")] # todo: use this approach once async-graphql is updated
pub struct NodePhrasing_Embedded {
    #[graphql(name = "text_base")]
	pub text_base: String,
    #[graphql(name = "text_negation")]
	pub text_negation: Option<String>,
    #[graphql(name = "text_question")]
	pub text_question: Option<String>,
    #[graphql(name = "text_narrative")]
	pub text_narrative: Option<String>,
	pub note: Option<String>,
	pub terms: Vec<TermAttachment>,
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct NodePhrasing {
    pub id: ID,
	pub creator: String,
	pub createdAt: i64,
	pub node: String,
	pub r#type: NodePhrasingType,
    #[graphql(name = "text_base")]
	pub text_base: String,
    #[graphql(name = "text_negation")]
	pub text_negation: Option<String>,
    #[graphql(name = "text_question")]
	pub text_question: Option<String>,
    #[graphql(name = "text_narrative")]
	pub text_narrative: Option<String>,
	pub note: Option<String>,
	pub terms: Vec<TermAttachment>,
	pub references: Vec<String>,
    
    #[graphql(name = "c_accessPolicyTargets")]
    pub c_accessPolicyTargets: Vec<AccessPolicyTarget>,
}
impl From<Row> for NodePhrasing {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct NodePhrasingInput {
	pub node: String,
	pub r#type: NodePhrasingType,
    #[graphql(name = "text_base")]
	pub text_base: String,
    #[graphql(name = "text_negation")]
	pub text_negation: Option<String>,
    #[graphql(name = "text_question")]
	pub text_question: Option<String>,
    #[graphql(name = "text_narrative")]
	pub text_narrative: Option<String>,
	pub note: Option<String>,
	pub terms: Vec<TermAttachment>,
	pub references: Vec<String>,
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct NodePhrasingUpdates {
	pub r#type: CanOmit<NodePhrasingType>,
    #[graphql(name = "text_base")]
	pub text_base: CanOmit<String>,
    #[graphql(name = "text_negation")]
	pub text_negation: CanNullOrOmit<String>,
    #[graphql(name = "text_question")]
	pub text_question: CanNullOrOmit<String>,
    #[graphql(name = "text_narrative")]
	pub text_narrative: CanNullOrOmit<String>,
	pub note: CanNullOrOmit<String>,
	pub terms: CanOmit<Vec<TermAttachment>>,
	pub references: CanOmit<Vec<String>>,
}

#[derive(Clone)] pub struct GQLSet_NodePhrasing { pub nodes: Vec<NodePhrasing> }
#[Object] impl GQLSet_NodePhrasing { async fn nodes(&self) -> &Vec<NodePhrasing> { &self.nodes } }
impl GQLSet<NodePhrasing> for GQLSet_NodePhrasing {
    fn from(entries: Vec<NodePhrasing>) -> GQLSet_NodePhrasing { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<NodePhrasing> { &self.nodes }
}

#[derive(Default)] pub struct QueryShard_NodePhrasing;
#[Object] impl QueryShard_NodePhrasing {
	async fn nodePhrasings(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<NodePhrasing>, GQLError> {
		handle_generic_gql_collection_query(ctx, "nodePhrasings", filter).await
	}
	async fn nodePhrasing(&self, ctx: &Context<'_>, id: String) -> Result<Option<NodePhrasing>, GQLError> {
		handle_generic_gql_doc_query(ctx, "nodePhrasings", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_NodePhrasing;
#[Subscription] impl SubscriptionShard_NodePhrasing {
    async fn nodePhrasings<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_NodePhrasing, SubError>> + 'a {
        handle_generic_gql_collection_subscription::<NodePhrasing, GQLSet_NodePhrasing>(ctx, "nodePhrasings", filter).await
    }
    async fn nodePhrasing<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<NodePhrasing>, SubError>> + 'a {
        handle_generic_gql_doc_subscription::<NodePhrasing>(ctx, "nodePhrasings", id).await
    }
}

}