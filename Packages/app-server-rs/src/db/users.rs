use rust_shared::SubError;
use anyhow::Context;
use async_graphql::{Object, Result, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future};
use hyper::{Body, Method};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio_postgres::{Client};
use std::{time::Duration, pin::Pin, task::Poll};

use crate::links::proxy_to_asjs::{HyperClient, APP_SERVER_JS_URL};
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};
use crate::utils::type_aliases::{JSONValue};

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[allow(clippy::struct_excessive_bools)]
pub struct PermissionGroups {
    basic: bool,
    verified: bool,
    r#mod: bool,
    admin: bool,
}
scalar!(PermissionGroups);

// for postgresql<>rust scalar-type mappings (eg. pg's i8 = rust's i64), see: https://kotiri.com/2018/01/31/postgresql-diesel-rust-types.html

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

//type User = String;
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: ID,
    pub displayName: String,
    pub photoURL: Option<String>,
    pub joinDate: i64,
    //pub permissionGroups: PermissionGroups,
    pub permissionGroups: PermissionGroups,
    //pub permissionGroups: async_graphql::Value,
    //pub permissionGroups: String,
    pub edits: i32,
    pub lastEditAt: Option<i64>,
}
// todo: MS these converters can be removed (eg. using approach similar to clone_ldchange_val_0with_type_fixes(), or by using crate: https://github.com/dac-gmbh/serde_postgres)
// [actually, just make a nice proc-macro wrapper around the postgres_row_to_json_value function, as seen in node_tags.rs]
impl From<tokio_postgres::row::Row> for User {
    fn from(row: tokio_postgres::row::Row) -> Self {
        //println!("ID as string:{}", row.get::<_, String>("id"));
        Self {
            //id: ID::from(row.get("id")),
            //id: serde_json::from_value(row.get("id")).unwrap(),
            //id: serde_json::from_str(row.get("id")).unwrap(),
            //id: serde_json::from_str(&row.get::<_, String>("id")).unwrap(),
            id: ID::from(&row.get::<_, String>("id")),
            displayName: row.get("displayName"),
            photoURL: row.get("photoURL"),
            joinDate: row.get("joinDate"),
            /*permissionGroups: PermissionGroups {
            //permissionGroups: Json::from(PermissionGroups {
                basic: true,
                verified: true,
                r#mod: true,
                admin: true,
            },*/
            //permissionGroups: row.get("permissionGroups"),
            permissionGroups: serde_json::from_value(row.get("permissionGroups")).unwrap(),
            //permissionGroups: async_graphql::value!("{}"),
            //permissionGroups: "{}".to_owned(),
            edits: row.get("edits"),
            lastEditAt: row.get("lastEditAt"),
        }
    }
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