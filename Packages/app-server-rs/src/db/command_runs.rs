use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::{get_first_item_from_stream_in_result_in_future, apply_gql_filter};

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

pub struct GQLSet_CommandRun<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_CommandRun<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_CommandRun;
#[Subscription]
impl SubscriptionShard_CommandRun {
    async fn commandRuns(&self, ctx: &Context<'_>, id: Option<String>, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSet_CommandRun<CommandRun>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"commandRuns\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"commandRuns\";", &[]).await.unwrap(),
        };
        let entries: Vec<CommandRun> = apply_gql_filter(&filter, rows.into_iter().map(|r| r.into()).collect());

        stream::once(async {
            GQLSet_CommandRun {
                nodes: entries, 
            }
        })
    }
    async fn commandRun(&self, ctx: &Context<'_>, id: String, filter: Option<serde_json::Value>) -> impl Stream<Item = Option<CommandRun>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.commandRuns(ctx, Some(id), filter)).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}