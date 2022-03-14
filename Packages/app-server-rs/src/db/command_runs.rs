use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_macros::wrap_async_graphql;
use serde::{Serialize, Deserialize};
use tokio_postgres::{Client};

use crate::utils::general::{handle_generic_gql_collection_request, GQLSet, handle_generic_gql_doc_request};
use crate::utils::filter::{Filter};

wrap_async_graphql!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
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

#[derive(Clone)] pub struct GQLSet_CommandRun { nodes: Vec<CommandRun> }
#[Object] impl GQLSet_CommandRun { async fn nodes(&self) -> &Vec<CommandRun> { &self.nodes } }
impl GQLSet<CommandRun> for GQLSet_CommandRun {
    fn from(entries: Vec<CommandRun>) -> GQLSet_CommandRun { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<CommandRun> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_CommandRun;
#[Subscription]
impl SubscriptionShard_CommandRun {
    async fn commandRuns<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Filter) -> impl Stream<Item = GQLSet_CommandRun> + 'a {
        handle_generic_gql_collection_request::<CommandRun, GQLSet_CommandRun>(ctx, "commandRuns", filter).await
    }
    async fn commandRun<'a>(&self, ctx: &'a Context<'_>, id: String, _filter: Filter) -> impl Stream<Item = Option<CommandRun>> + 'a {
        handle_generic_gql_doc_request::<CommandRun>(ctx, "commandRuns", id).await
    }
}

}