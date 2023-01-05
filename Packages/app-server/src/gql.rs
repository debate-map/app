use std::borrow::Cow;
use std::collections::HashMap;
use std::convert::Infallible;
use std::env;
use std::future::Future;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use rust_shared::anyhow::anyhow;
use rust_shared::async_graphql::http::{playground_source, GraphQLPlaygroundConfig, graphiql_source};
use rust_shared::async_graphql::{Schema, MergedObject, MergedSubscription, ObjectType, Data, Result, SubscriptionType, EmptyMutation, EmptySubscription, Variables, extensions};
use rust_shared::bytes::Bytes;
use deadpool_postgres::{Pool, Manager};
use rust_shared::hyper::header::CONTENT_LENGTH;
use rust_shared::hyper::{Body, service};
use rust_shared::hyper::client::HttpConnector;
use rust_shared::anyhow::Error;
use rust_shared::rust_macros::{wrap_async_graphql, wrap_agql_schema_build, wrap_slow_macros, wrap_agql_schema_type};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Client};
use rust_shared::utils::auth::jwt_utils_base::UserJWTData;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{axum, tower, tower_http, serde_json};
use tower::make::Shared;
use tower::{Service, ServiceExt, BoxError, service_fn};
use tower_http::cors::{CorsLayer, Origin};
use rust_shared::{async_graphql, async_graphql::futures_util::task::{Context, Poll}};
use rust_shared::async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use axum::http::{Method, HeaderValue};
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, Router};
use axum::body::{boxed, BoxBody, HttpBody};
use axum::extract::ws::{CloseFrame, Message};
use axum::extract::{FromRequest, RequestParts, WebSocketUpgrade};
use axum::http::{self, uri::Uri, Request, Response, StatusCode};
use axum::{
    extract::Extension,
};
use tracing::{info, error};
use rust_shared::url::Url;
use std::{convert::TryFrom, net::SocketAddr};
use futures_util::future::{BoxFuture, Ready};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{future, Sink, SinkExt, StreamExt, FutureExt, TryFutureExt, TryStreamExt};
use crate::db::commands::add_access_policy::MutationShard_AddAccessPolicy;
use crate::db::commands::add_argument_and_claim::MutationShard_AddArgumentAndClaim;
use crate::db::commands::add_child_node::MutationShard_AddChildNode;
use crate::db::commands::add_map::MutationShard_AddMap;
use crate::db::commands::add_media::MutationShard_AddMedia;
use crate::db::commands::add_node_link::MutationShard_AddNodeLink;
use crate::db::commands::add_node_phrasing::MutationShard_AddNodePhrasing;
use crate::db::commands::add_node_revision::MutationShard_AddNodeRevision;
use crate::db::commands::add_node_tag::MutationShard_AddNodeTag;
use crate::db::commands::add_share::MutationShard_AddShare;
use crate::db::commands::add_term::MutationShard_AddTerm;
use crate::db::commands::delete_access_policy::MutationShard_DeleteAccessPolicy;
use crate::db::commands::delete_argument::MutationShard_DeleteArgument;
use crate::db::commands::delete_map::MutationShard_DeleteMap;
use crate::db::commands::delete_media::MutationShard_DeleteMedia;
use crate::db::commands::delete_node::MutationShard_DeleteNode;
use crate::db::commands::delete_node_link::MutationShard_DeleteNodeLink;
use crate::db::commands::delete_node_phrasing::MutationShard_DeleteNodePhrasing;
use crate::db::commands::delete_node_rating::MutationShard_DeleteNodeRating;
use crate::db::commands::delete_node_tag::MutationShard_DeleteNodeTag;
use crate::db::commands::delete_share::MutationShard_DeleteShare;
use crate::db::commands::delete_term::MutationShard_DeleteTerm;
use crate::db::commands::link_node::MutationShard_LinkNode;
use crate::db::commands::set_node_is_multi_premise_argument::MutationShard_SetNodeIsMultiPremiseArgument;
use crate::db::commands::set_node_rating::MutationShard_SetNodeRating;
use crate::db::commands::set_user_follow_data::MutationShard_SetUserFollowData;
use crate::db::commands::transfer_nodes::MutationShard_TransferNodes;
use crate::db::commands::update_access_policy::MutationShard_UpdateAccessPolicy;
use crate::db::commands::update_node_link::MutationShard_UpdateNodeLink;
use crate::db::commands::update_map::MutationShard_UpdateMap;
use crate::db::commands::update_media::MutationShard_UpdateMedia;
use crate::db::commands::update_node::MutationShard_UpdateNode;
use crate::db::commands::update_node_phrasing::MutationShard_UpdateNodePhrasing;
use crate::db::commands::update_node_tag::MutationShard_UpdateNodeTag;
use crate::db::commands::update_share::MutationShard_UpdateShare;
use crate::db::commands::update_term::MutationShard_UpdateTerm;
use crate::db::commands::update_user::MutationShard_UpdateUser;
use crate::db::commands::update_user_hidden::MutationShard_UpdateUserHidden;
use crate::db::general::backups::QueryShard_General_Backups;
use crate::db::general::search::QueryShard_General_Search;
use crate::db::general::sign_in::SubscriptionShard_SignIn;
use crate::db::general::subtree::{QueryShard_General_Subtree, MutationShard_General_Subtree};
use crate::db::general::subtree_old::QueryShard_General_Subtree_Old;
use crate::store::storage::AppStateArc;
use crate::utils::db::agql_ext::gql_general_extension::{CustomExtension, CustomExtensionCreator};
use crate::utils::db::agql_ext::gql_request_storage::GQLRequestStorage;
use crate::utils::general::general::body_to_str;
use crate::db::_general::{MutationShard_General, QueryShard_General, SubscriptionShard_General};
use crate::db::access_policies::SubscriptionShard_AccessPolicy;
use crate::db::command_runs::SubscriptionShard_CommandRun;
use crate::db::feedback_proposals::SubscriptionShard_Proposal;
use crate::db::feedback_user_infos::SubscriptionShard_UserInfo;
use crate::db::global_data::SubscriptionShard_GlobalData;
use crate::db::map_node_edits::SubscriptionShard_NodeEdit;
use crate::db::maps::SubscriptionShard_Map;
use crate::db::medias::SubscriptionShard_Media;
use crate::db::node_links::SubscriptionShard_NodeLink;
use crate::db::node_phrasings::SubscriptionShard_NodePhrasing;
use crate::db::node_ratings::SubscriptionShard_NodeRating;
use crate::db::node_revisions::SubscriptionShard_NodeRevision;
use crate::db::node_tags::SubscriptionShard_NodeTag;
use crate::db::nodes::SubscriptionShard_Node;
use crate::db::shares::SubscriptionShard_Share;
use crate::db::terms::SubscriptionShard_Term;
use crate::db::user_hiddens::{SubscriptionShard_UserHidden};
use crate::db::users::{SubscriptionShard_User};
use crate::store::live_queries::LQStorageArc;
use rust_shared::{async_graphql_axum};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse, GraphQLSubscription, GraphQLProtocol, GraphQLWebSocket, GraphQLBatchRequest};

wrap_slow_macros!{

#[derive(MergedObject, Default)]
pub struct QueryRoot(
    QueryShard_General, QueryShard_General_Backups, QueryShard_General_Subtree, QueryShard_General_Subtree_Old, QueryShard_General_Search,
);

#[derive(MergedObject, Default)]
pub struct MutationRoot(
    MutationShard_General, MutationShard_General_Subtree,
    // commands, matching standard add/delete/update pattern
    MutationShard_AddAccessPolicy, MutationShard_AddMap, MutationShard_AddMedia, MutationShard_AddNodeLink, MutationShard_AddNodePhrasing, MutationShard_AddNodeTag, MutationShard_AddShare, MutationShard_AddTerm,
    MutationShard_DeleteAccessPolicy, MutationShard_DeleteMap, MutationShard_DeleteMedia, MutationShard_DeleteNodeLink, MutationShard_DeleteNodePhrasing, MutationShard_DeleteNodeTag, MutationShard_DeleteShare, MutationShard_DeleteTerm,
    MutationShard_UpdateAccessPolicy, MutationShard_UpdateMap, MutationShard_UpdateMedia, MutationShard_UpdateNodeLink, MutationShard_UpdateNodePhrasing, MutationShard_UpdateNodeTag, MutationShard_UpdateShare, MutationShard_UpdateTerm,
    // commands, others
    MutationShard_AddArgumentAndClaim, MutationShard_AddChildNode, MutationShard_AddNodeRevision,
    MutationShard_DeleteArgument, MutationShard_DeleteNode, MutationShard_DeleteNodeRating,
    MutationShard_LinkNode,
    MutationShard_SetNodeIsMultiPremiseArgument, MutationShard_SetNodeRating, MutationShard_SetUserFollowData,
    MutationShard_TransferNodes,
    MutationShard_UpdateNode, MutationShard_UpdateUser, MutationShard_UpdateUserHidden,
);

#[derive(MergedSubscription, Default)]
pub struct SubscriptionRoot(
    SubscriptionShard_General, SubscriptionShard_SignIn,
    // table-specific
    SubscriptionShard_User, SubscriptionShard_UserHidden,
    SubscriptionShard_GlobalData, SubscriptionShard_Map,
    SubscriptionShard_Term, SubscriptionShard_AccessPolicy, SubscriptionShard_Media,
    SubscriptionShard_CommandRun, SubscriptionShard_Proposal, SubscriptionShard_UserInfo,
    SubscriptionShard_Node, SubscriptionShard_NodeLink, SubscriptionShard_NodeEdit,
    SubscriptionShard_NodePhrasing, SubscriptionShard_NodeRating, SubscriptionShard_NodeRevision, SubscriptionShard_NodeTag,
    SubscriptionShard_Share,
);

}

pub type RootSchema = wrap_agql_schema_type!{
    Schema<QueryRoot, MutationRoot, SubscriptionRoot>
};

async fn graphiql() -> impl IntoResponse {
    // use the DEV/PROD value from the "ENV" env-var, to determine what the app-server's URL is (maybe temp)
    let app_server_host = if env::var("ENV").unwrap_or("DEV".to_owned()) == "DEV" { "localhost:5110" } else { "app-server.debates.app" };
    response::Html(graphiql_source("/graphql", Some(&format!("wss://{app_server_host}/graphql"))))
}
async fn graphql_playground() -> impl IntoResponse {
    response::Html(playground_source(
        GraphQLPlaygroundConfig::new("/graphql").subscription_endpoint("/graphql"),
    ))
}

// version based on actix-web example (https://github.com/async-graphql/examples/blob/1492794f9001cfe7a37058ba7be3c6461b0cc70a/actix-web/token-from-header/src/main.rs#L37)
/*async fn websocket_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    GraphQLSubscription::new(Schema::clone(&*schema))
        .with_data(data)
        .on_connection_init(on_connection_init)
        .start(&req, payload)
}*/

// version based on poem example (https://github.com/async-graphql/examples/blob/1492794f9001cfe7a37058ba7be3c6461b0cc70a/poem/token-from-header/src/main.rs#L44)
async fn graphql_websocket_handler(/*Extension(state): Extension<AppStateArc>,*/ Extension(schema): Extension<RootSchema>, /*req: Request<Body>,*/ ws: WebSocketUpgrade, protocol: GraphQLProtocol) -> impl IntoResponse {
    let mut data = async_graphql::Data::default();
    let request_storage = GQLRequestStorage::new();
    data.insert(request_storage);
    /*if let Some(token) = get_token_from_headers(headers) {
        data.insert(token);
    }*/

    // we cannot retrieve the raw "Request<Body>" using axum-extract while also retrieving the "WebSocketUpgrade", so just assume caller requested the "graphql-ws" protocol (it's what the main dm-client is using)
    //let protocol = GraphQLProtocol(WebSocketProtocols::GraphQLWS);

    /*info!("Handling ws request:{:?} @ws:{:?}", req, ws);
    let mut req_agql_parts = RequestParts::new(req);
    let protocol = match GraphQLProtocol::from_request(&mut req_agql_parts).await {
        Ok(protocol) => protocol,
        Err(err) => {
            //return response::Html(format!("<div>Error parsing graphql-protocol from request headers:{:?}</div>", err))
            //error!("/monitor-backend-link endpoint was called, but the caller was not an in-cluster pod! @callerIP:{}", addr.ip());
            let body_json_val = json!({"error": format!("Error parsing graphql-protocol from request headers:{:?}", err)});
            let body = Body::from(body_json_val.to_string()).boxed_unsync();
            return Response::builder().status(StatusCode::BAD_REQUEST).body(body).unwrap().into_response();
        },
    };*/

    // NOTE: Don't be confused; the "protocol names" are confusingly misaligned with their "subprotocol header values". (https://github.com/async-graphql/async-graphql/issues/1196#issuecomment-1371985251)
    //info!("Handling ws request:{:?} @protocol:{:?}", ws, protocol);

    let schema_clone = schema.clone();
    ws
        .protocols(ALL_WEBSOCKET_PROTOCOLS)
        .on_upgrade(move |stream| {
            GraphQLWebSocket::new(stream, schema_clone, protocol)
                .with_data(data)
                //.on_connection_init(on_connection_init)
                .serve()
        })
}
/*pub async fn on_connection_init(value: serde_json::Value) -> Result<Data> {
    #[derive(Deserialize)]
    struct Payload {
        token: String,
    }

    // Coerce the connection params into our `Payload` struct so we can
    // validate the token exists in the headers.
    if let Ok(payload) = serde_json::from_value::<Payload>(value) {
        let mut data = Data::default();
        data.insert(Token(payload.token));
        Ok(data)
    } else {
        Err("Token is required".into())
    }
}*/

pub async fn extend_router(app: Router, storage_wrapper: AppStateArc) -> Router {
    let schema =
        wrap_agql_schema_build!{
            Schema::build(QueryRoot::default(), MutationRoot::default(), SubscriptionRoot::default())
        }
        .data(storage_wrapper)
        .extension(CustomExtensionCreator)
        .finish();

    let client_to_asjs = HyperClient::new();
    //let gql_subscription_service = GraphQLSubscription::new(schema.clone());

    let result = app
        .route("/graphiql", get(graphiql))
        .route("/gql-playground", get(graphql_playground))
        .route("/graphql",
            // approach 1 (using standard routing functions)
            //on_service(MethodFilter::GET, gql_subscription_service).post(handle_gql_query_or_mutation)
            get(graphql_websocket_handler).post(handle_gql_query_or_mutation)

            // approach 2 (custom first-layer service-function)
            // omitted for now; you can reference the "one-shot" pattern here: https://github.com/tokio-rs/axum/blob/422a883cb2a81fa6fbd2f2a1affa089304b7e47b/examples/http-proxy/src/main.rs#L40
        )
        //.fallback(get(handle_gql_query_or_mutation).merge(post(handle_gql_query_or_mutation)))
        .layer(Extension(schema))
        .layer(Extension(client_to_asjs));

    info!("Playground: http://localhost:[view readme]");
    result
}

pub type HyperClient = rust_shared::hyper::client::Client<HttpConnector, Body>;
pub async fn handle_gql_query_or_mutation(Extension(_client): Extension<HyperClient>, Extension(schema): Extension<RootSchema>, req: Request<Body>) -> Response<Body> {
    let response_str = match have_own_graphql_handle_request(req, schema).await {
        Ok(a) => a,
        Err(err) => format!("Got error during passing/execution of graphql request to/in app-server's gql engine:{err:?}"),
    };

    // send response (to frontend)
    /*let mut response = Response::builder().body(axum::body::Body::from(response_str)).unwrap();
    response.headers_mut().append(CONTENT_TYPE, HeaderValue::from_static("content-type: application/json; charset=utf-8"));*/
    let response = Response::builder()
        .header(CONTENT_TYPE, "application/json")
        .body(Body::from(response_str))
        .unwrap();
    response
}
pub async fn have_own_graphql_handle_request(req: Request<Body>, schema: RootSchema) -> Result<String, Error> {
    // retrieve auth-data/JWT and such from http-headers
    let gql_data_from_http_request = get_gql_data_from_http_request(&req);
    
    // read request's body (from frontend)
    let req_as_str = body_to_str(req.into_body()).await?;
    let req_as_json = JSONValue::from_str(&req_as_str)?;

    // prepare request for graphql engine
    //let gql_req = async_graphql::Request::new(req_as_str);
    let gql_req = async_graphql::Request::new(req_as_json["query"].as_str().ok_or(anyhow!("The \"query\" field must be a string."))?);
    let gql_req = match req_as_json["operationName"].as_str() {
        Some(op_name) => gql_req.operation_name(op_name),
        None => gql_req,
    };
    let gql_req = gql_req.variables(Variables::from_json(req_as_json["variables"].clone()));

    // attach auth-data/JWT and such to async-graphql context-data
    let gql_req = gql_req.data(gql_data_from_http_request);

    // send request to graphql engine, and read response
    let gql_response = schema.execute(gql_req).await;
    //let response_body: String = gql_response.data.to_string(); // this doesn't output valid json (eg. no quotes around keys)
    let response_str: String = serde_json::to_string(&gql_response)?;
    
    Ok(response_str)
}

pub fn get_gql_data_from_http_request(req: &Request<Body>) -> GQLDataFromHTTPRequest {
    let mut data = GQLDataFromHTTPRequest { jwt: None, referrer: None };
    if let Some(header) = req.headers().get("authorization") {
        //info!("Found authorization header.");
        if let Some(parts) = header.to_str().unwrap().split_once("Bearer ") {
            //info!("Found bearer part2/jwt-string:{}", parts.1.to_owned());
            data.jwt = Some(parts.1.to_owned());
        }
    }

    if let Some(header) = req.headers().get("referrer") {
        //info!("Found referrer header.");
        if let Ok(referrer) = header.to_str() {
            //info!("Found referrer part2:{}", referrer);
            data.referrer = Some(referrer.to_owned());
        }
    }
    data
}

pub struct GQLDataFromHTTPRequest {
    pub jwt: Option<String>,
    pub referrer: Option<String>,
}