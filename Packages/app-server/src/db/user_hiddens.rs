use rust_shared::indexmap::IndexMap;
use rust_shared::serde_json::json;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{SubError, serde_json};
use rust_shared::anyhow::{Error};
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::utils::db::accessors::{AccessorContext, get_db_entries, get_db_entry};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

use super::commands::_command::{FieldUpdate_Nullable, FieldUpdate};

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
    pub providerData: JSONValue,
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
    pub extras: JSONValue,
}
impl From<Row> for UserHidden {
	fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct UserHiddenUpdates {
	pub backgroundID: FieldUpdate_Nullable<String>,
    #[graphql(name = "backgroundCustom_enabled")]
	pub backgroundCustom_enabled: FieldUpdate_Nullable<bool>,
    #[graphql(name = "backgroundCustom_color")]
	pub backgroundCustom_color: FieldUpdate_Nullable<String>,
    #[graphql(name = "backgroundCustom_url")]
	pub backgroundCustom_url: FieldUpdate_Nullable<String>,
    #[graphql(name = "backgroundCustom_position")]
	pub backgroundCustom_position: FieldUpdate_Nullable<String>,
	pub addToStream: FieldUpdate<bool>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct UserHidden_Extras {
    pub userFollows: Option<IndexMap<String, UserFollow>>,
}

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct UserFollow {
	pub markRatings: bool,
    #[graphql(name = "markRatings_symbol")]
	pub markRatings_symbol: String,
    #[graphql(name = "markRatings_color")]
	pub markRatings_color: String,
    #[graphql(name = "markRatings_size")]
	pub markRatings_size: f64,
}

#[derive(Clone)] pub struct GQLSet_UserHidden { pub nodes: Vec<UserHidden> }
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