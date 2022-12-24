use rust_shared::{SubError, serde, serde_json, async_graphql};
use rust_shared::anyhow::{Context, Error};
use rust_shared::async_graphql::{Object, Result, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future};
use rust_shared::hyper::{Body, Method};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Row, Client};
use std::{time::Duration, pin::Pin, task::Poll};

use crate::utils::db::accessors::{get_db_entries, get_db_entry, AccessorContext};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

use super::commands::_command::FieldUpdate;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)] //#[serde(crate = "rust_shared::serde")]
#[allow(clippy::struct_excessive_bools)]
pub struct PermissionGroups {
    pub basic: bool,
    pub verified: bool,
    pub r#mod: bool,
    pub admin: bool,
}
scalar!(PermissionGroups);

pub async fn get_user(ctx: &AccessorContext<'_>, id: &str) -> Result<User, Error> {
    get_db_entry(ctx, "users", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
/*pub async fn get_users(ctx: &AccessorContext<'_>) -> Result<Vec<User>, Error> {
    get_db_entries(ctx, "users", &None).await
}*/

// for postgresql<>rust scalar-type mappings (eg. pg's i8 = rust's i64), see: https://kotiri.com/2018/01/31/postgresql-diesel-rust-types.html

wrap_slow_macros!{

//type User = String;
#[derive(SimpleObject, Clone, Serialize, Deserialize, Debug)]
pub struct User {
    pub id: ID,
    pub displayName: String,
    pub photoURL: Option<String>,
    pub joinDate: i64,
    pub permissionGroups: PermissionGroups,
    pub edits: i32,
    pub lastEditAt: Option<i64>,
}
impl From<Row> for User {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(InputObject, Deserialize)]
pub struct UserUpdates {
	pub displayName: FieldUpdate<String>,
	pub permissionGroups: FieldUpdate<PermissionGroups>,
}

//#[derive(SimpleObject, Clone)] #[derive(Clone)] pub struct GQLSet_User<T> { nodes: Vec<T> }
/*#[derive(Clone)] pub struct GQLSet_User<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_User<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }*/
#[derive(Clone)] pub struct GQLSet_User { nodes: Vec<User> }
#[Object] impl GQLSet_User { async fn nodes(&self) -> &Vec<User> { &self.nodes } }
impl GQLSet<User> for GQLSet_User {
    fn from(entries: Vec<User>) -> GQLSet_User { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<User> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_User;
#[Subscription]
impl SubscriptionShard_User {
    async fn users<'a>(&self, ctx: &'a async_graphql::Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_User, SubError>> + 'a {
        handle_generic_gql_collection_request::<User, GQLSet_User>(ctx, "users", filter).await
    }
    async fn user<'a>(&self, ctx: &'a async_graphql::Context<'_>, id: String) -> impl Stream<Item = Result<Option<User>, SubError>> + 'a {
        handle_generic_gql_doc_request::<User>(ctx, "users", id).await
    }
}

}