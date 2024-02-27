use rust_shared::indexmap::IndexMap;
use rust_shared::serde_json::json;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{SubError, serde_json, GQLError};
use rust_shared::anyhow::{Error};
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::utils::db::accessors::{AccessorContext, get_db_entries, get_db_entry};
use crate::utils::db::generic_handlers::queries::{handle_generic_gql_doc_query, handle_generic_gql_collection_query};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::{db::{generic_handlers::{subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet}}, filter::FilterInput}};

use super::commands::_command::{CanNullOrOmit, CanOmit};

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
    // todo: fix that this is not actually getting updated when user creates choosen a different access-policy for a new entry (or, rename this field)
    pub lastAccessPolicy: Option<String>,
    pub extras: JSONValue,
}
impl UserHidden {
	pub fn extras_known(&self) -> Result<UserHidden_Extras, Error> {
		Ok(serde_json::from_value(self.extras.clone())?)
	}
}
impl From<Row> for UserHidden {
	fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct UserHiddenUpdates {
	pub backgroundID: CanNullOrOmit<String>,
    #[graphql(name = "backgroundCustom_enabled")]
	pub backgroundCustom_enabled: CanNullOrOmit<bool>,
    #[graphql(name = "backgroundCustom_color")]
	pub backgroundCustom_color: CanNullOrOmit<String>,
    #[graphql(name = "backgroundCustom_url")]
	pub backgroundCustom_url: CanNullOrOmit<String>,
    #[graphql(name = "backgroundCustom_position")]
	pub backgroundCustom_position: CanNullOrOmit<String>,
	pub addToStream: CanOmit<bool>,
	pub extras: CanOmit<JSONValue>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct UserHidden_Extras {
    pub userFollows: Option<IndexMap<String, UserFollow>>,
    pub defaultAccessPolicy_nodeRatings: Option<String>,
}
pub fn user_hidden_extras_locked_subfields() -> Vec<&'static str> { vec![] }

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

#[derive(Default)] pub struct QueryShard_UserHidden;
#[Object] impl QueryShard_UserHidden {
	async fn userHiddens(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<UserHidden>, GQLError> {
		handle_generic_gql_collection_query(ctx, "userHiddens", filter).await
	}
	async fn userHidden(&self, ctx: &Context<'_>, id: String) -> Result<Option<UserHidden>, GQLError> {
		handle_generic_gql_doc_query(ctx, "userHiddens", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_UserHidden;
#[Subscription] impl SubscriptionShard_UserHidden {
    async fn userHiddens<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_UserHidden, SubError>> + 'a {
        handle_generic_gql_collection_subscription::<UserHidden, GQLSet_UserHidden>(ctx, "userHiddens", filter).await
    }
    async fn userHidden<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<UserHidden>, SubError>> + 'a {
        handle_generic_gql_doc_subscription::<UserHidden>(ctx, "userHiddens", id).await
    }
}

}