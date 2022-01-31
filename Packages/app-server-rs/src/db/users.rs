use async_graphql::{Context, Object, Result, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future};
use hyper::{Body, Method};
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio_postgres::{Client};
use std::{time::Duration, pin::Pin, task::Poll};

use crate::proxy_to_asjs::{HyperClient, APP_SERVER_JS_URL};
use crate::utils::general::{get_first_item_from_stream_in_result_in_future, handle_generic_gql_collection_request, GQLSet, handle_generic_gql_doc_request};
use crate::utils::filter::{Filter};
use crate::utils::type_aliases::JSONValue;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct PermissionGroups {
    basic: bool,
	verified: bool,
	r#mod: bool,
	admin: bool,
}
scalar!(PermissionGroups);

// for postgresql<>rust scalar-type mappings (eg. pg's i8 = rust's i64), see: https://kotiri.com/2018/01/31/postgresql-diesel-rust-types.html

//type User = String;
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct User {
    id: ID,
    displayName: String,
    photoURL: Option<String>,
    joinDate: i64,
    //permissionGroups: PermissionGroups,
    //permissionGroups: Json<PermissionGroups>,
    permissionGroups: PermissionGroups,
    //permissionGroups: async_graphql::Value,
    //permissionGroups: String,
    edits: i32,
    lastEditAt: Option<i64>,
}
// todo: MS these converters can be removed (eg. using approach similar to clone_ldchange_val_0with_type_fixes(), or by using crate: https://github.com/dac-gmbh/serde_postgres)
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

#[derive(Default)]
pub struct QueryShard_User;
#[Object]
impl QueryShard_User {
    /// async-graphql requires that to be at least one entry under the Query section
    async fn empty(&self) -> &str { &"" }
}

#[derive(Default)]
pub struct MutationShard_User;
#[Object]
impl MutationShard_User {
    #[graphql(name = "_GetConnectionID")]
    async fn _GetConnectionID(&self, ctx: &Context<'_>) -> Result<GetConnectionID_Result> {
        Ok(GetConnectionID_Result {
            id: "todo".to_owned()
        })
    }
}

struct GetConnectionID_Result {
    id: String,
}
#[Object]
impl GetConnectionID_Result {
    async fn id(&self) -> &str { &self.id }
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

struct PassConnectionID_Result {
    userID: Option<String>,
}
#[Object]
impl PassConnectionID_Result {
    async fn userID(&self) -> &Option<String> { &self.userID }
}

#[derive(Default)]
pub struct SubscriptionShard_User;
#[Subscription]
impl SubscriptionShard_User {
    #[graphql(name = "_PassConnectionID")]
    async fn _PassConnectionID(&self, ctx: &Context<'_>, connectionID: String) -> impl Stream<Item = PassConnectionID_Result> {
        println!("Connection-id was passed from client:{}", connectionID);
        //let userID = "DM_SYSTEM_000000000001".to_owned();
        let mut userID: Option<String> = None;

        let client_to_asjs = HyperClient::new();
        
        let query_as_str = format!("query {{ _PassConnectionID(connectionID: \"{}\") {{ userID }} }}", connectionID);
        let request_body_as_str = json!({
            //"operationName":"CustomOpName",
            "query": query_as_str,
            "variables":{},
        }).to_string();

        let request = hyper::Request::builder()
            .method(Method::POST)
            .uri(format!("{}/graphql", APP_SERVER_JS_URL))
            .header("Content-Type", "application/json")
            .body(Body::from(request_body_as_str))
            .unwrap();

        match client_to_asjs.request(request).await {
            Ok(response) => {
                if let Ok(response_as_bytes) = hyper::body::to_bytes(response.into_body()).await {
                    let response_as_str_cow = String::from_utf8_lossy(&*response_as_bytes);
                    let response_as_str = response_as_str_cow.as_ref();
                    // example str: {"data":{"_PassConnectionID":{"userID":"ABC123ABC123ABC123ABC1"}}}
                    if let Ok(response_as_json) = serde_json::from_str::<JSONValue>(response_as_str) {
                        if let Some(user_id_str) = response_as_json["data"]["_PassConnectionID"]["userID"].as_str() {
                            if user_id_str.len() == 22 {
                                userID = Some(user_id_str.to_owned());
                            } else {
                                println!("Failed to retrieve user-id from app-server-js, for _PassConnectionID message. Response:{}", response_as_str);
                            }
                        }
                    }
                }
            },
            // one example of why this can fail: if the app-server-js pod crashed
            Err(err) => {
                // I don't know if/how async-graphql supports error-passing for streams, so just print to server atm
                println!("Error occurred while trying to send _PassConnectionID message to app-server-js:{}", err);
            },
        };

        stream::once(async { PassConnectionID_Result {
            userID,
        } })
    }

    // tests
    /*async fn test(&self, /*mutation_type: Option<MutationType>*/) -> impl Stream<Item = i32> {
        stream::iter(0..100)
    }*/

    async fn users<'a>(&self, ctx: &'a Context<'_>, id: Option<String>, filter: Filter) -> impl Stream<Item = GQLSet_User> + 'a {
        handle_generic_gql_collection_request::<User, GQLSet_User>(ctx, "users", filter).await
    }
    async fn user<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Option<User>> + 'a {
        handle_generic_gql_doc_request::<User>(ctx, "users", id).await
    }
}