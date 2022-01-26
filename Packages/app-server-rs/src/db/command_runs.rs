use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::{get_first_item_from_stream_in_result_in_future, handle_generic_gql_collection_request, GQLSet, handle_generic_gql_doc_request};

#[derive(SimpleObject)]
pub struct CommandRun {
    id: ID,
    actor: String,
	runTime: i64,
    #[graphql(name = "public_base")]
    public_base: bool,
    commandName: String,
    commandPayload: serde_json::Value,
    returnData: serde_json::Value,
    rlsTargets: serde_json::Value,
}
impl From<tokio_postgres::row::Row> for CommandRun {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            actor: row.get("actor"),
            runTime: row.get("runTime"),
            public_base: row.get("public_base"),
            commandName: row.get("commandName"),
            commandPayload: serde_json::from_value(row.get("commandPayload")).unwrap(),
            returnData: serde_json::from_value(row.get("returnData")).unwrap(),
            rlsTargets: serde_json::from_value(row.get("rlsTargets")).unwrap(),
		}
	}
}

pub struct GQLSet_CommandRun { nodes: Vec<CommandRun> }
#[Object] impl GQLSet_CommandRun { async fn nodes(&self) -> &Vec<CommandRun> { &self.nodes } }
impl GQLSet<CommandRun> for GQLSet_CommandRun {
    fn from(entries: Vec<CommandRun>) -> GQLSet_CommandRun { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<CommandRun> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_CommandRun;
#[Subscription]
impl SubscriptionShard_CommandRun {
    async fn commandRuns(&self, ctx: &Context<'_>, id: Option<String>, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSet_CommandRun> {
        handle_generic_gql_collection_request::<CommandRun, GQLSet_CommandRun>(ctx, "commandRuns", filter).await
    }
    async fn commandRun(&self, ctx: &Context<'_>, id: String, filter: Option<serde_json::Value>) -> impl Stream<Item = Option<CommandRun>> {
        handle_generic_gql_doc_request::<CommandRun, GQLSet_CommandRun>(ctx, "commandRuns", &id).await
    }
}