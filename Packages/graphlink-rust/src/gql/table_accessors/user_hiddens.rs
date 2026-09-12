use crate::anyhow::Error;
use crate::async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use crate::indexmap::IndexMap;
use crate::rust_macros::wrap_slow_macros;
use crate::serde::{Deserialize, Serialize};
use crate::serde_json::json;
use crate::tokio_postgres::{Client, Row};
use crate::utils::errors::errors::{GQLError, SubError};
use crate::utils::general::type_aliases::JSONValue;
use crate::{async_graphql, ListChange, ListChangeType, ToOwnedV};
use crate::{get_db_entries, get_db_entry, AccessorContext};
use crate::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, FilterInput};
use crate::{serde, ListChangeCore};
use crate::{CanNullOrOmit, CanOmit};
use futures_util::{stream, Stream, TryFutureExt};
use std::collections::HashMap;

#[rustfmt::skip]
pub async fn get_user_hidden(ctx: &AccessorContext<'_>, id: &str) -> Result<UserHidden, Error> {
    get_db_entry(ctx, "user_hiddens", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
pub async fn get_user_hiddens(ctx: &AccessorContext<'_>, email: Option<String>) -> Result<Vec<UserHidden>, Error> {
	let mut filter_map = serde_json::Map::new();
	if let Some(email) = email {
		filter_map.insert("email".o(), json!({"equalTo": email}));
	}
	get_db_entries(ctx, "user_hiddens", &Some(JSONValue::Object(filter_map))).await
}

wrap_slow_macros! {

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct UserHidden {
	pub id: ID,
	pub email: String,
	pub providerData: JSONValue,
	pub extras: JSONValue,
}
/*impl UserHidden {
	pub fn extras_known(&self) -> Result<UserHidden_Extras, Error> {
		Ok(serde_json::from_value(self.extras.clone())?)
	}
}*/
/*impl From<Row> for UserHidden {
	fn from(row: Row) -> Self { postgres_row_to_entry_struct(row, "user_hiddens").unwrap() }
}*/

#[derive(InputObject, Serialize, Deserialize)]
pub struct UserHiddenUpdates {
	pub extras: CanOmit<JSONValue>,
}

#[derive(Clone)] pub struct ListChange_UserHidden { pub core: ListChangeCore<UserHidden> }
#[Object] impl ListChange_UserHidden {
	async fn changeType(&self) -> &ListChangeType { &self.core.changeType }
	async fn idOfRemoved(&self) -> &Option<String> { &self.core.idOfRemoved }
	async fn data(&self) -> &Vec<UserHidden> { &self.core.data }
	async fn hashes(&self) -> &HashMap<String, String> { &self.core.hashes }
}
impl ListChange<UserHidden> for ListChange_UserHidden {
	fn from(core: ListChangeCore<UserHidden>) -> ListChange_UserHidden { Self { core } }
}

#[derive(Default)] pub struct QueryShard_UserHidden;
#[Object] impl QueryShard_UserHidden {
	async fn userHiddens(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<UserHidden>, GQLError> {
		handle_generic_gql_collection_query(ctx, "user_hiddens", filter).await
	}
	async fn userHidden(&self, ctx: &Context<'_>, id: String) -> Result<Option<UserHidden>, GQLError> {
		handle_generic_gql_doc_query(ctx, "user_hiddens", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_UserHidden;
#[Subscription] impl SubscriptionShard_UserHidden {
	async fn userHiddens<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>, cached_entry_hashes: Option<HashMap<String, String>>) -> impl Stream<Item = Result<ListChange_UserHidden, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<UserHidden, ListChange_UserHidden>(ctx, "user_hiddens", filter, cached_entry_hashes, None).await
	}
	async fn userHidden<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<UserHidden>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<UserHidden>(ctx, "user_hiddens", id).await
	}
}

}
