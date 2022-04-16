use anyhow::{Context, Error};
use async_graphql::{Object, Result, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future};
use hyper::{Body, Method};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio_postgres::{Client};
use tracing::{info, error};
use std::path::Path;
use std::{time::Duration, pin::Pin, task::Poll};

use crate::links::proxy_to_asjs::{HyperClient, APP_SERVER_JS_URL};
use crate::utils::general::general::body_to_str;
use crate::utils::type_aliases::{JSONValue};

wrap_slow_macros!{

// queries
// ==========

#[derive(Default)]
pub struct QueryShard_General;
#[Object]
impl QueryShard_General {
    /// async-graphql requires there to be at least one entry under the Query section
    async fn empty(&self) -> &str { "" }
}

// mutations
// ==========

struct GetConnectionID_Result { id: String }
#[Object]
impl GetConnectionID_Result {
    async fn id(&self) -> &str { &self.id }
}

#[derive(Default)]
pub struct MutationShard_General;
#[Object]
impl MutationShard_General {
    #[graphql(name = "_GetConnectionID")]
    async fn _GetConnectionID(&self, _ctx: &async_graphql::Context<'_>) -> Result<GetConnectionID_Result> {
        Ok(GetConnectionID_Result {
            id: "todo".to_owned()
        })
    }
}

// subscriptions
// ==========

struct PassConnectionID_Result { userID: Option<String> }
#[Object]
impl PassConnectionID_Result {
    async fn userID(&self) -> &Option<String> { &self.userID }
}

struct Ping_Result {
    pong: String,
    refreshPage: bool,
}
#[Object]
impl Ping_Result {
    async fn pong(&self) -> &str { &self.pong }
    async fn refreshPage(&self) -> &bool { &self.refreshPage }
}

#[derive(Default)]
pub struct SubscriptionShard_General;
#[Subscription]
impl SubscriptionShard_General {
    // tests
    /*async fn test(&self, /*mutation_type: Option<MutationType>*/) -> impl Stream<Item = i32> {
        stream::iter(0..100)
    }*/
    
    #[graphql(name = "_Ping")]
    async fn _Ping(&self, _ctx: &async_graphql::Context<'_>) -> impl Stream<Item = Ping_Result> {
        let pong = "pong".to_owned();
        // create the listed file in the app-server-rs pod (eg. using Lens), if you've made an update that you need all clients to refresh for
        let refreshPage = Path::new("./refreshPageForAllUsers_enabled").exists();
        
        stream::once(async move { Ping_Result {
            pong,
            refreshPage,
        } })
    }

    #[graphql(name = "_PassConnectionID")]
    async fn _PassConnectionID(&self, _ctx: &async_graphql::Context<'_>, #[graphql(name = "connectionID")] connectionID: String) -> impl Stream<Item = PassConnectionID_Result> {
        info!("Connection-id was passed from client:{}", connectionID);
        //let userID = "DM_SYSTEM_000000000001".to_owned();
        let userID = match get_user_id_from_connection_id(connectionID).await {
            Ok(userID) => userID,
            Err(err) => {
                error!("Failed to retrieve user-id from connection id. @error:{}", err);
                None
            }
        };

        stream::once(async { PassConnectionID_Result {
            userID,
        } })
    }
}

}

async fn get_user_id_from_connection_id(connection_id: String) -> Result<Option<String>, Error> {
    let mut user_id = None;
    
    let client_to_asjs = HyperClient::new();
        
    let query_as_str = format!("query {{ _PassConnectionID(connectionID: \"{}\") {{ userID }} }}", connection_id);
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

    // one example of why this can fail: if the app-server-js pod crashed
    let response = client_to_asjs.request(request).await.with_context(|| "Error occurred while trying to send _PassConnectionID message to app-server-js.")?;
    let response_as_str = body_to_str(response.into_body()).await.with_context(|| "Could not convert response into string.")?;
    
    // example str: {"data":{"_PassConnectionID":{"userID":"ABC123ABC123ABC123ABC1"}}}
    let response_as_json = serde_json::from_str::<JSONValue>(&response_as_str).with_context(|| format!("Could not parse response-str as json:{}", response_as_str))?;
    let user_id_str = response_as_json["data"]["_PassConnectionID"]["userID"].as_str().with_context(|| format!("Response was malformed; should have GraphQL response shape. @response:{}", response_as_str))?;
    if user_id_str.len() == 22 {
        user_id = Some(user_id_str.to_owned());
    } else {
        error!("User-id in GraphQL response was invalid; should have a length of 22. Response:{}", response_as_str);
    }

    Ok(user_id)
}