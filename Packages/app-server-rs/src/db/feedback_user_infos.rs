use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::get_first_item_from_stream_in_result_in_future;

#[derive(SimpleObject)]
pub struct UserInfo {
    id: ID,
    proposalsOrder: Vec<String>,
}
impl From<tokio_postgres::row::Row> for UserInfo {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            proposalsOrder: row.get("proposalsOrder"),
		}
	}
}

pub struct GQLSet_UserInfo<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_UserInfo<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_UserInfo;
#[Subscription]
impl SubscriptionShard_UserInfo {
    #[graphql(name = "feedback_userInfos")]
    async fn feedback_userInfos(&self, ctx: &Context<'_>, id: Option<String>) -> impl Stream<Item = GQLSet_UserInfo<UserInfo>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"feedback_userInfos\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"feedback_userInfos\";", &[]).await.unwrap(),
        };
        let entries: Vec<UserInfo> = rows.into_iter().map(|r| r.into()).collect();

        stream::once(async {
            GQLSet_UserInfo {
                nodes: entries, 
            }
        })
    }
    #[graphql(name = "feedback_userInfo")]
    async fn feedback_userInfo(&self, ctx: &Context<'_>, id: String) -> impl Stream<Item = Option<UserInfo>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.feedback_userInfos(ctx, Some(id))).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}