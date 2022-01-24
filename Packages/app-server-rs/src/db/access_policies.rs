use std::panic;

use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::get_first_item_from_stream_in_result_in_future;

#[derive(Clone)]
pub struct AccessPolicy {
    id: ID,
	creator: String,
	createdAt: i64,
    name: String,
    permissions: serde_json::Value,
    permissions_userExtends: serde_json::Value,
}
#[Object]
impl AccessPolicy {
    async fn id(&self) -> &str { &self.id }
    async fn creator(&self) -> &str { &self.creator }
    async fn createdAt(&self) -> &i64 { &self.createdAt }
    async fn name(&self) -> &str { &self.name }
    async fn permissions(&self) -> &serde_json::Value { &self.permissions }
    #[graphql(name = "permissions_userExtends")]
    async fn permissions_userExtends(&self) -> &serde_json::Value { &self.permissions_userExtends }
}
impl From<tokio_postgres::row::Row> for AccessPolicy {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            name: row.get("name"),
            permissions: serde_json::from_value(row.get("permissions")).unwrap(),
            permissions_userExtends: serde_json::from_value(row.get("permissions_userExtends")).unwrap(),
		}
	}
}

pub struct GQLSet_AccessPolicy<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_AccessPolicy<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_AccessPolicy;
#[Subscription]
impl SubscriptionShard_AccessPolicy {
    async fn accessPolicies(&self, ctx: &Context<'_>, id: Option<String>) -> impl Stream<Item = GQLSet_AccessPolicy<AccessPolicy>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"accessPolicies\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"accessPolicies\";", &[]).await.unwrap(),
        };
        let entries: Vec<AccessPolicy> = rows.into_iter().map(|r| r.into()).collect();

        stream::once(async {
            GQLSet_AccessPolicy {
                nodes: entries, 
            }
        })
    }
    async fn accessPolicy(&self, ctx: &Context<'_>, id: String) -> impl Stream<Item = Option<AccessPolicy>> {
        /*let result = panic::catch_unwind(|| {
            panic!("oh no!");
        });
        println!("Caught error:{:?}", result);
        if let Err(err) = result {
            //panic::resume_unwind(err);
            //panic::always_abort();
            std::process::abort();
        }*/
        
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.accessPolicies(ctx, Some(id))).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}