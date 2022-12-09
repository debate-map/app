use rust_shared::serde_json::json;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{SubError, serde_json};
use rust_shared::anyhow::{Error};
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::utils::db::accessors::{AccessorContext, get_db_entries, get_db_entry};
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

pub async fn get_user_hidden(ctx: &AccessorContext<'_>, id: &str) -> Result<UserHidden, Error> {
    get_db_entry(ctx, "userHiddens", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
pub async fn get_user_hiddens(ctx: &AccessorContext<'_>, email: Option<String>) -> Result<Vec<UserHidden>, Error> {
    let mut filter_map = serde_json::Map::new();
    if let Some(email) = email {
        filter_map.insert("email".to_owned(), json!({"equalTo": email}));
    }
    get_db_entries(ctx, "userHiddens", &Some(JSONValue::Object(filter_map))).await
}

wrap_slow_macros!{

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct UserHidden {
    pub id: ID,
    pub email: String,
    pub providerData: serde_json::Value,
    pub backgroundID: Option<String>,
    #[graphql(name = "backgroundCustom_enabled")]
    pub backgroundCustom_enabled: Option<bool>,
    #[graphql(name = "backgroundCustom_color")]
    pub backgroundCustom_color: Option<String>,
    #[graphql(name = "backgroundCustom_url")]
    pub backgroundCustom_url: Option<String>,
    #[graphql(name = "backgroundCustom_position")]
    pub backgroundCustom_position: Option<String>,
    pub addToStream: bool,
    pub lastAccessPolicy: Option<String>,
    pub extras: serde_json::Value,
}
impl From<Row> for UserHidden {
	fn from(row: Row) -> Self {
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

#[derive(Clone)] pub struct GQLSet_UserHidden { nodes: Vec<UserHidden> }
#[Object] impl GQLSet_UserHidden { async fn nodes(&self) -> &Vec<UserHidden> { &self.nodes } }
impl GQLSet<UserHidden> for GQLSet_UserHidden {
    fn from(entries: Vec<UserHidden>) -> GQLSet_UserHidden { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<UserHidden> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_UserHidden;
#[Subscription]
impl SubscriptionShard_UserHidden {
    async fn userHiddens<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_UserHidden, SubError>> + 'a {
        handle_generic_gql_collection_request::<UserHidden, GQLSet_UserHidden>(ctx, "userHiddens", filter).await
    }
    async fn userHidden<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<UserHidden>, SubError>> + 'a {
        handle_generic_gql_doc_request::<UserHidden>(ctx, "userHiddens", id).await
    }
}

}