use deadpool_postgres::tokio_postgres::Row;
use futures_util::{stream, Stream, TryFutureExt};
use rust_shared::anyhow::Error;
use rust_shared::async_graphql;
use rust_shared::async_graphql::ComplexObject;
use rust_shared::async_graphql::Enum;
use rust_shared::async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json;
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::Client;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{GQLError, SubError};

use crate::utils::db::generic_handlers::queries::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::db::{
	accessors::{get_db_entry, AccessorContext},
	filter::FilterInput,
	generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet},
};

use super::_shared::access_policy_target::AccessPolicyTarget;
use super::_shared::attachments::Attachment;
use super::node_phrasings::NodePhrasing;
use super::node_phrasings::NodePhrasing_Embedded;
use super::nodes::get_node;

#[rustfmt::skip]
pub async fn get_node_revision(ctx: &AccessorContext<'_>, id: &str) -> Result<NodeRevision, Error> {
    get_db_entry(ctx, "nodeRevisions", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

wrap_slow_macros! {

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(complex)]
pub struct NodeRevision {
	pub id: ID,
	pub creator: String,
	pub createdAt: i64,
	pub node: String,
	/// Warning: In rare cases, this can reference a node-revision that no longer exists. (eg. if admin force-deleted a node-revision)
	pub replacedBy: Option<String>,
	pub phrasing: NodePhrasing_Embedded,
	/*#[graphql(name = "phrasing_tsvector")]
	#[serde(skip_serializing)] // makes-so when serializing the struct for saving to the db, this field is excluded (as it must be, since it's auto-generated)
	pub phrasing_tsvector: String,*/
	pub displayDetails: Option<JSONValue>,
	pub attachments: Vec<Attachment>,

	#[graphql(name = "c_accessPolicyTargets")]
	pub c_accessPolicyTargets: Vec<AccessPolicyTarget>,
}
#[ComplexObject]
impl NodeRevision {
	/*#[graphql(visible = false)]
	// todo: make-so the field has this as its actual type (delayed since it means a change in the graphql api)
	pub fn display_details_known(&self) -> Result<Option<NodeRevisionDisplayDetails>, Error> {
		Ok(match &self.displayDetails {
			None => None,
			Some(raw_data) => Some(serde_json::from_value(raw_data.clone())?),
		})
	}*/

	#[graphql(visible = false)]
	// field kept around only for backwards compatibility (refs: papers-app)
	async fn note(&self) -> Option<String> {
		self.phrasing.note.clone()
	}
}
impl NodeRevision {
	pub fn into_input(self, keep_node: bool) -> NodeRevisionInput {
		NodeRevisionInput {
			node: if keep_node { Some(self.node) } else { None },
			phrasing: self.phrasing,
			displayDetails: self.displayDetails,
			attachments: self.attachments,
		}
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
	pub displayDetails: Option<JSONValue>,
	pub attachments: Vec<Attachment>,
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
pub struct NodeRevisionDisplayDetails {
	fontSizeOverride: Option<f64>,
	widthOverride: Option<f64>,
	childLayout: Option<ChildLayout>,
	childOrdering: Option<ChildOrdering>,
}
#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize, Hash, Debug)]
pub enum ChildLayout {
	#[graphql(name = "grouped")] grouped,
	#[graphql(name = "dmStandard")] dmStandard,
	#[graphql(name = "slStandard")] slStandard,
	#[graphql(name = "flat")] flat,
}
#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize, Hash, Debug)]
pub enum ChildOrdering {
	//#[graphql(name = "unchanged")] unchanged,
	#[graphql(name = "manual")] manual,
	#[graphql(name = "date")] date,
	#[graphql(name = "votes")] votes,
	#[graphql(name = "reasonScore")] reasonScore,
}

#[derive(Clone)] pub struct GQLSet_NodeRevision { pub nodes: Vec<NodeRevision> }
#[Object] impl GQLSet_NodeRevision { async fn nodes(&self) -> &Vec<NodeRevision> { &self.nodes } }
impl GQLSet<NodeRevision> for GQLSet_NodeRevision {
	fn from(entries: Vec<NodeRevision>) -> GQLSet_NodeRevision { Self { nodes: entries } }
	fn nodes(&self) -> &Vec<NodeRevision> { &self.nodes }
}

#[derive(Default)] pub struct QueryShard_NodeRevision;
#[Object] impl QueryShard_NodeRevision {
	async fn nodeRevisions(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<NodeRevision>, GQLError> {
		handle_generic_gql_collection_query(ctx, "nodeRevisions", filter).await
	}
	async fn nodeRevision(&self, ctx: &Context<'_>, id: String) -> Result<Option<NodeRevision>, GQLError> {
		handle_generic_gql_doc_query(ctx, "nodeRevisions", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_NodeRevision;
#[Subscription] impl SubscriptionShard_NodeRevision {
	async fn nodeRevisions<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_NodeRevision, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<NodeRevision, GQLSet_NodeRevision>(ctx, "nodeRevisions", filter).await
	}
	async fn nodeRevision<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<NodeRevision>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<NodeRevision>(ctx, "nodeRevisions", id).await
	}
}

}
