use rust_shared::anyhow::{Context, Error};
use rust_shared::async_graphql::{Object, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future};
use rust_shared::hyper::{Body, Method};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::{async_graphql, serde_json, GQLError, SubError, to_sub_err};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Client};
use tracing::{info, error};
use std::path::Path;
use std::{time::Duration, pin::Pin, task::Poll};

use crate::utils::db::agql_ext::gql_request_storage::GQLRequestStorage;
use crate::utils::general::general::body_to_str;

use super::commands::add_term::{AddTermResult};
use super::commands::refresh_lq_data::refresh_lq_data;
use super::general::sign_in_::jwt_utils::{get_user_jwt_data_from_gql_ctx, resolve_and_verify_jwt_string};

//use super::commands::transfer_nodes::transfer_nodes;

wrap_slow_macros!{

// queries
// ==========

#[derive(Default)]
pub struct QueryShard_General;
#[Object]
impl QueryShard_General {
    // useful for testing monitor-tool's logs page
    async fn print_empty_log(&self) -> &str {
        info!("print_empty_log called");
        ""
    }
}

// mutations
// ==========

/*struct GetConnectionID_Result { id: String }
#[Object]
impl GetConnectionID_Result {
    async fn id(&self) -> &str { &self.id }
}*/

#[derive(Default)] pub struct MutationShard_General;
#[Object] impl MutationShard_General {
    /*#[graphql(name = "_GetConnectionID")]
    async fn _GetConnectionID(&self, _ctx: &async_graphql::Context<'_>) -> Result<GetConnectionID_Result, GQLError> {
        Ok(GetConnectionID_Result {
            id: "todo".to_owned()
        })
    }*/

    async fn refreshLQData(&self, ctx: &async_graphql::Context<'_>, payload: JSONValue) -> Result<GenericMutation_Result, GQLError> {
        let result = refresh_lq_data(ctx, payload).await?;
        Ok(result)
    }
}
#[derive(SimpleObject)]
pub struct GenericMutation_Result {
    pub message: String,
}

// subscriptions
// ==========

/*struct PassConnectionID_Result { userID: Option<String> }
#[Object]
impl PassConnectionID_Result {
    async fn userID(&self) -> &Option<String> { &self.userID }
}*/

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
    
    #[graphql(name = "_ping")]
    async fn _ping(&self, _ctx: &async_graphql::Context<'_>) -> impl Stream<Item = Ping_Result> {
        let pong = "pong".to_owned();
        // create the listed file in the app-server pod (eg. using Lens), if you've made an update that you need all clients to refresh for
        let refreshPage = Path::new("./refreshPageForAllUsers_enabled").exists();
        
        stream::once(async move { Ping_Result {
            pong,
            refreshPage,
        } })
    }

    /*#[graphql(name = "_PassConnectionID")]
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
    }*/

    async fn signInAttach<'a>(&self, ctx: &'a async_graphql::Context<'a>, input: SignInAttachInput) -> impl Stream<Item = Result<SignInAttachResult, SubError>> + 'a {
        let jwt_storage_arc = {
            let request_storage = ctx.data::<GQLRequestStorage>().unwrap();
            let jwt_storage_arc = &request_storage.jwt;
            jwt_storage_arc.clone()
        };
        
        let SignInAttachInput { jwt } = input;

        let base_stream = async_stream::stream! {
            //let jwt_data = get_user_jwt_data_from_gql_ctx(ctx).await.map_err(to_sub_err)?;
            let jwt_data = if let Some(jwt) = jwt {
                Some(resolve_and_verify_jwt_string(&jwt).await.map_err(to_sub_err)?)
            } else { None };
            
            // put in block, to ensure that lock is released quickly (not sure if block is necessary to achieve this)
            {
                let mut jwt_storage = jwt_storage_arc.write().await;
                *jwt_storage = jwt_data;
            }
            yield Ok(SignInAttachResult { success: true });
        };
        base_stream
    }

    // meant only for debugging, so hide from gql api introspection
    #[graphql(visible = false)]
    async fn checkUser<'a>(&self, ctx: &'a async_graphql::Context<'a>) -> impl Stream<Item = Result<CheckUserResult, SubError>> + 'a {
        let base_stream = async_stream::stream! {
            let jwt_data = get_user_jwt_data_from_gql_ctx(ctx).await.map_err(to_sub_err)?;
            yield Ok(CheckUserResult { userID: jwt_data.id });
        };
        base_stream
    }
}

#[derive(InputObject, Deserialize)]
pub struct SignInAttachInput {
    // this is settable to null/none, since caller may have cases where it wants to "sign out", yet keep the same websocket connection open
	pub jwt: Option<String>,
}

/*#[derive(SimpleObject, Debug)]
pub struct DeleteArgumentResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}*/
#[derive(SimpleObject, Debug)]
struct SignInAttachResult {
    success: bool,
}

#[derive(SimpleObject, Debug)]
struct CheckUserResult {
    userID: String,
}

}