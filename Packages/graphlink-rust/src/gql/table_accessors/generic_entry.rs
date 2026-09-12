/*use crate::anyhow::Error;
use crate::async_graphql;
use crate::async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use crate::rust_macros::wrap_slow_macros;
use crate::serde;
use crate::serde::{Deserialize, Serialize};
use crate::serde_json;
use crate::serde_json::json;
use crate::tokio_postgres::{Client, Row};
use crate::utils::general::type_aliases::JSONValue;
use crate::{get_db_entry, AccessorContext};
use crate::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, FilterInput, ListChange, ListChangeMeta, ListChangeType};
use crate::{CanNullOrOmit, CanOmit};
use crate::{GQLError, SubError};
use futures_util::{stream, Stream, TryFutureExt};

wrap_slow_macros! {

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct GenericEntry {
	pub id: ID,
	pub extras: JSONValue,
}
/*impl From<Row> for GenericEntry {
	fn from(row: Row) -> Self { postgres_row_to_entry_struct(row, "GENERIC_TEMP").unwrap() }
}*/

#[derive(Clone)] pub struct ListChange_GenericEntry { pub meta: ListChangeMeta, pub data: Vec<GenericEntry> }
#[Object] impl ListChange_GenericEntry {
	async fn changeType(&self) -> &ListChangeType { &self.core.changeType }
	async fn idOfRemoved(&self) -> &Option<String> { &self.core.idOfRemoved }
	async fn data(&self) -> &Vec<GenericEntry> { &self.core.data }
}
impl ListChange<GenericEntry> for ListChange_GenericEntry {
	fn from(meta: ListChangeMeta, data: Vec<GenericEntry>) -> ListChange_GenericEntry { Self { meta, data } }
}

/*#[derive(Default)] pub struct QueryShard_GenericEntry;
#[Object] impl QueryShard_GenericEntry {
	async fn activities(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<Map>, GQLError> { handle_generic_gql_collection_query(ctx, "maps", filter).await }

	async fn map(&self, ctx: &Context<'_>, id: String) -> Result<Option<Map>, GQLError> { handle_generic_gql_doc_query(ctx, "maps", id).await }
}*/

#[derive(Default)] pub struct SubscriptionShard_GenericEntry;
#[Subscription] impl SubscriptionShard_GenericEntry {
	async fn activities<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "activities", filter, None).await }
	async fn bundles<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "bundles", filter, None).await }
	async fn entities<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "entities", filter, None).await }
	async fn engine_configs<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "engine_configs", filter, None).await }
	async fn global_data<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "global_data", filter, None).await }
	async fn journal_entries<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "journal_entries", filter, None).await }
	//async fn lights<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "lights", filter, None).await }
	async fn recording_sessions<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "recording_sessions", filter, None).await }
	async fn scenes<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "scenes", filter, None).await }
	async fn scripts<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "scripts", filter, None).await }
	async fn sessions<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "sessions", filter, None).await }
	async fn shakes<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "shakes", filter, None).await }
	async fn sounds<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "sounds", filter, None).await }
	async fn stories<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "stories", filter, None).await }
	async fn story_messages<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "story_messages", filter, None).await }
	async fn test_segments<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "test_segments", filter, None).await }
	async fn timeline_events<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<ListChange_GenericEntry, SubError>> + 'a { handle_generic_gql_collection_subscription::<GenericEntry, ListChange_GenericEntry>(ctx, "timeline_events", filter, None).await }

	//async fn activity<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<ListChange_GenericEntry>, SubError>> + 'a { handle_generic_gql_doc_subscription::<ListChange_GenericEntry>(ctx, "activities", id).await }
}

}*/
