use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::get_first_item_from_stream_in_result_in_future;

#[derive(SimpleObject)]
pub struct UserHidden {
    id: ID,
    email: String,
    providerData: serde_json::Value,
    backgroundID: Option<String>,
    #[graphql(name = "backgroundCustom_enabled")]
    backgroundCustom_enabled: Option<bool>,
    #[graphql(name = "backgroundCustom_color")]
    backgroundCustom_color: Option<String>,
    #[graphql(name = "backgroundCustom_url")]
    backgroundCustom_url: Option<String>,
    #[graphql(name = "backgroundCustom_position")]
    backgroundCustom_position: Option<String>,
    addToStream: bool,
    lastAccessPolicy: Option<String>,
    extras: serde_json::Value,
}
impl From<tokio_postgres::row::Row> for UserHidden {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            email: row.get("email"),
            providerData: serde_json::from_value(row.get("providerData")).unwrap(),
            backgroundID: row.get("backgroundID"),
            backgroundCustom_enabled: row.get("backgroundCustom_enabled"),
            backgroundCustom_color: row.get("backgroundCustom_color"),
            backgroundCustom_url: row.get("backgroundCustom_url"),
            backgroundCustom_position: row.get("backgroundCustom_position"),
            addToStream: row.get("addToStream"),
            lastAccessPolicy: row.get("lastAccessPolicy"),
            extras: serde_json::from_value(row.get("extras")).unwrap(),
		}
	}
}

/*#[derive(Default)]
pub struct MutationShard_UserHidden;
#[Object]
impl MutationShard_UserHidden {
    async fn empty(&self) -> &str { &"" }
}*/

pub struct GQLSet_UserHidden<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_UserHidden<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_UserHidden;
#[Subscription]
impl SubscriptionShard_UserHidden {
    async fn userHiddens(&self, ctx: &Context<'_>, id: Option<String>) -> impl Stream<Item = GQLSet_UserHidden<UserHidden>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"userHiddens\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"userHiddens\";", &[]).await.unwrap(),
        };
        let entries: Vec<UserHidden> = rows.into_iter().map(|r| r.into()).collect();

        stream::once(async {
            GQLSet_UserHidden {
                nodes: entries, 
            }
        })
    }
    async fn userHidden(&self, ctx: &Context<'_>, id: String) -> impl Stream<Item = Option<UserHidden>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.userHiddens(ctx, Some(id))).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}