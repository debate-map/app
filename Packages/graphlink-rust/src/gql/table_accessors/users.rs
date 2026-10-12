use crate::anyhow::Error;
use crate::async_graphql::{async_stream, scalar, Context, EmptySubscription, InputObject, Object, OutputType, Result, Schema, SimpleObject, Subscription, ID};
use crate::rust_macros::wrap_slow_macros;
use crate::serde::{Deserialize, Serialize};
use crate::serde_json::json;
use crate::tokio_postgres::{Client, Row};
use crate::utils::errors::errors::{GQLError, SubError};
use crate::{async_graphql, serde, serde_json, JSONValue, ListChange, ListChangeType};
use crate::{get_db_entries, get_db_entry, AccessorContext};
use crate::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, FilterInput};
use crate::{CanOmit, ListChangeCore};
use futures_util::{stream, Future, Stream, StreamExt, TryFutureExt};
use std::collections::HashMap;
use std::{pin::Pin, task::Poll, time::Duration};

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)] //#[serde(crate = "rust_shared::serde")]
#[allow(clippy::struct_excessive_bools)]
pub struct PermissionGroups {
	pub basic: bool,
	pub verified: bool,
	pub r#mod: bool,
	pub admin: bool,
}
scalar!(PermissionGroups);
impl PermissionGroups {
	pub fn all_false() -> Self {
		Self { basic: false, verified: false, r#mod: false, admin: false }
	}
}

#[rustfmt::skip]
pub async fn get_user(ctx: &AccessorContext<'_>, id: &str) -> Result<User, Error> {
    get_db_entry(ctx, "users", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
pub async fn get_users(ctx: &AccessorContext<'_>) -> Result<Vec<User>, Error> {
	get_db_entries(ctx, "users", &None).await
}

// for postgresql<>rust scalar-type mappings (eg. pg's i8 = rust's i64), see: https://kotiri.com/2018/01/31/postgresql-diesel-rust-types.html

wrap_slow_macros! {

//type User = String;
#[derive(SimpleObject, Clone, Serialize, Deserialize, Debug)]
pub struct User {
	pub id: ID,
	pub displayName: String,
	pub photoURL: Option<String>,
	pub joinDate: i64,
	pub permissionGroups: PermissionGroups,
	/*pub edits: i32,
	pub lastEditAt: Option<i64>,*/
	pub extras: JSONValue,
}
/*impl From<Row> for User {
	fn from(row: Row) -> Self { postgres_row_to_entry_struct(row, "users").unwrap() }
}*/

#[derive(InputObject, Serialize, Deserialize)]
pub struct UserUpdates {
	pub displayName: CanOmit<String>,
	pub permissionGroups: CanOmit<PermissionGroups>,
}

//#[derive(SimpleObject, Clone)] #[derive(Clone)] pub struct GQLSet_User<T> { pub nodes: Vec<T> }
/*#[derive(Clone)] pub struct GQLSet_User<T> { pub nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_User<T> { pub async fn nodes(&self) -> &Vec<T> { &self.nodes } }*/

/*#[derive(Clone)] pub struct ListChange_User { pub meta: ListChangeMeta, pub data: Vec<User> }
#[Object] impl ListChange_User {
	async fn changeType(&self) -> &ListChangeType { &self.core.changeType }
	async fn idOfRemoved(&self) -> &Option<String> { &self.core.idOfRemoved }
	async fn data(&self) -> &Vec<User> { &self.core.data }
}
impl ListChange<User> for ListChange_User {
	fn from(meta: ListChangeMeta, data: Vec<User>) -> ListChange_User { Self { meta, data } }
}*/

#[derive(Clone)] pub struct ListChange_User { pub core: ListChangeCore<User> }
#[Object] impl ListChange_User {
	async fn changeType(&self) -> &ListChangeType { &self.core.changeType }
	async fn idOfRemoved(&self) -> &Option<String> { &self.core.idOfRemoved }
	async fn data(&self) -> &Vec<User> { &self.core.data }
	async fn hashes(&self) -> &HashMap<String, String> { &self.core.hashes }
}
impl ListChange<User> for ListChange_User {
	fn from(core: ListChangeCore<User>) -> ListChange_User { Self { core } }
}

#[derive(Default)] pub struct QueryShard_User;
#[Object] impl QueryShard_User {
	async fn users(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<User>, GQLError> {
		handle_generic_gql_collection_query(ctx, "users", filter).await
	}
	async fn user(&self, ctx: &Context<'_>, id: String) -> Result<Option<User>, GQLError> {
		handle_generic_gql_doc_query(ctx, "users", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_User;
#[Subscription] impl SubscriptionShard_User {
	async fn users<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>, cached_entry_hashes: Option<HashMap<String, String>>) -> impl Stream<Item = Result<ListChange_User, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<User, ListChange_User>(ctx, "users", filter, cached_entry_hashes, None).await
	}
	async fn user<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<User>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<User>(ctx, "users", id).await
	}
}

}
