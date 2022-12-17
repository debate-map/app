use std::borrow::Cow;
use std::collections::HashMap;
use std::convert::Infallible;
use std::env;
use std::future::Future;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use rust_shared::async_graphql::http::{playground_source, GraphQLPlaygroundConfig, graphiql_source};
use rust_shared::async_graphql::{Schema, MergedObject, MergedSubscription, ObjectType, Data, Result, SubscriptionType, EmptyMutation, EmptySubscription, Variables, extensions};
use rust_shared::bytes::Bytes;
use deadpool_postgres::{Pool, Manager};
use rust_shared::hyper::header::CONTENT_LENGTH;
use rust_shared::hyper::{Body, service};
use rust_shared::hyper::client::HttpConnector;
use rust_shared::rust_macros::{wrap_async_graphql, wrap_agql_schema_build, wrap_slow_macros, wrap_agql_schema_type};
use rust_shared::tokio_postgres::{Client};
use rust_shared::{axum, tower, tower_http};
use tower::make::Shared;
use tower::{Service, ServiceExt, BoxError, service_fn};
use tower_http::cors::{CorsLayer, Origin};
use rust_shared::{async_graphql, async_graphql::futures_util::task::{Context, Poll}};
use rust_shared::async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use axum::http::{Method, HeaderValue};
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router};
use axum::body::{boxed, BoxBody, HttpBody};
use axum::extract::ws::{CloseFrame, Message};
use axum::extract::{FromRequest, RequestParts, WebSocketUpgrade};
use axum::http::{self, uri::Uri, Request, Response, StatusCode};
use axum::Error;
use axum::{
    extract::Extension,
};
use tracing::info;
use rust_shared::url::Url;
use std::{convert::TryFrom, net::SocketAddr};
use futures_util::future::{BoxFuture, Ready};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{future, Sink, SinkExt, StreamExt, FutureExt, TryFutureExt, TryStreamExt};
use crate::db::commands::add_access_policy::MutationShard_AddAccessPolicy;
use crate::db::commands::add_media::MutationShard_AddMedia;
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
use crate::db::commands::delete_node_phrasing::MutationShard_DeleteNodePhrasing;
use crate::db::commands::delete_node_rating::MutationShard_DeleteNodeRating;
use crate::db::commands::delete_node_tag::MutationShard_DeleteNodeTag;
use crate::db::commands::delete_share::MutationShard_DeleteShare;
use crate::db::commands::delete_term::MutationShard_DeleteTerm;
use crate::db::commands::unlink_node::MutationShard_UnlinkNode;
use crate::db::commands::update_access_policy::MutationShard_UpdateAccessPolicy;
use crate::db::commands::update_media::MutationShard_UpdateMedia;
use crate::db::commands::update_node_phrasing::MutationShard_UpdateNodePhrasing;
use crate::db::commands::update_node_tag::MutationShard_UpdateNodeTag;
use crate::db::commands::update_share::MutationShard_UpdateShare;
use crate::db::commands::update_term::MutationShard_UpdateTerm;
use crate::db::general::search::QueryShard_General_Search;
use crate::db::general::_sign_in::SubscriptionShard_SignIn;
use crate::db::general::subtree::{QueryShard_General_Subtree, MutationShard_General_Subtree};
use crate::db::general::subtree_old::QueryShard_General_Subtree_Old;
use crate::store::storage::AppStateWrapper;
use crate::utils::db::agql_ext::gql_general_extension::{CustomExtension, CustomExtensionCreator};
use crate::{get_cors_layer};
use crate::db::_general::{MutationShard_General, QueryShard_General, SubscriptionShard_General};
use crate::db::access_policies::SubscriptionShard_AccessPolicy;
use crate::db::command_runs::SubscriptionShard_CommandRun;
use crate::db::feedback_proposals::SubscriptionShard_Proposal;
use crate::db::feedback_user_infos::SubscriptionShard_UserInfo;
use crate::db::global_data::SubscriptionShard_GlobalData;
use crate::db::map_node_edits::SubscriptionShard_NodeEdit;
use crate::db::maps::SubscriptionShard_Map;
use crate::db::medias::SubscriptionShard_Media;
use crate::db::node_child_links::SubscriptionShard_NodeChildLink;
use crate::db::node_phrasings::SubscriptionShard_NodePhrasing;
use crate::db::node_ratings::SubscriptionShard_NodeRating;
use crate::db::node_revisions::SubscriptionShard_NodeRevision;
use crate::db::node_tags::SubscriptionShard_NodeTag;
use crate::db::nodes::SubscriptionShard_Node;
use crate::db::shares::SubscriptionShard_Share;
use crate::db::terms::SubscriptionShard_Term;
use crate::db::user_hiddens::{SubscriptionShard_UserHidden};
use crate::db::users::{SubscriptionShard_User};
use crate::links::proxy_to_asjs::{maybe_proxy_to_asjs_handler, HyperClient, have_own_graphql_handle_request};
use crate::store::live_queries::LQStorageWrapper;
use rust_shared::{async_graphql_axum};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse, GraphQLSubscription, GraphQLProtocol, GraphQLWebSocket, GraphQLBatchRequest};

wrap_slow_macros!{

#[derive(MergedObject, Default)]
pub struct QueryRoot(
    QueryShard_General, QueryShard_General_Subtree, QueryShard_General_Subtree_Old, QueryShard_General_Search,
);

#[derive(MergedObject, Default)]
pub struct MutationRoot(
    MutationShard_General, MutationShard_General_Subtree,
    // commands, matching standard add/delete/update pattern
    MutationShard_AddAccessPolicy, MutationShard_AddMedia, MutationShard_AddNodePhrasing, MutationShard_AddNodeTag, MutationShard_AddShare, MutationShard_AddTerm,
    MutationShard_DeleteAccessPolicy, MutationShard_DeleteMedia, MutationShard_DeleteNodePhrasing, MutationShard_DeleteNodeTag, MutationShard_DeleteShare, MutationShard_DeleteTerm,
    MutationShard_UpdateAccessPolicy, MutationShard_UpdateMedia, MutationShard_UpdateNodePhrasing, MutationShard_UpdateNodeTag, MutationShard_UpdateShare, MutationShard_UpdateTerm,
    // commands, others
    MutationShard_AddNodeRevision,
    MutationShard_DeleteArgument, MutationShard_DeleteMap, MutationShard_DeleteNode, MutationShard_DeleteNodeRating,
    MutationShard_UnlinkNode,
);

#[derive(MergedSubscription, Default)]
pub struct SubscriptionRoot(
    SubscriptionShard_General, SubscriptionShard_SignIn,
    // table-specific
    SubscriptionShard_User, SubscriptionShard_UserHidden,
    SubscriptionShard_GlobalData, SubscriptionShard_Map,
    SubscriptionShard_Term, SubscriptionShard_AccessPolicy, SubscriptionShard_Media,
    SubscriptionShard_CommandRun, SubscriptionShard_Proposal, SubscriptionShard_UserInfo,
    SubscriptionShard_Node, SubscriptionShard_NodeChildLink, SubscriptionShard_NodeEdit,
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

pub async fn extend_router(app: Router, pool: Pool, storage_wrapper: AppStateWrapper, lq_storage_wrapper: LQStorageWrapper) -> Router {
    let schema =
        wrap_agql_schema_build!{
            Schema::build(QueryRoot::default(), MutationRoot::default(), SubscriptionRoot::default())
        }
        //.data(client_for_graphql)
        .data(pool)
        .data(storage_wrapper)
        .data(lq_storage_wrapper)
        //.extension(extensions::Logger)
        .extension(CustomExtensionCreator)
        //.data(connection)
        .finish();

    let client_to_asjs = HyperClient::new();
    let gql_subscription_service = GraphQLSubscription::new(schema.clone());

    let result = app
        .route("/graphiql-new", get(graphiql)) // todo: rename this to just graphiql, once app-server-js is retired
        .route("/gql-playground", get(graphql_playground))
        .route("/graphql",
            // approach 1 (using standard routing functions)
            on_service(MethodFilter::GET, gql_subscription_service.clone()).post(maybe_proxy_to_asjs_handler)

            // approach 2 (custom first-layer service-function) [based on pattern here: https://github.com/tokio-rs/axum/blob/422a883cb2a81fa6fbd2f2a1affa089304b7e47b/examples/http-proxy/src/main.rs#L40]
            /*tower::service_fn({
                let graphql_router_layered = Router::new()
                    .route("/graphql", post(proxy_to_asjs_handler).on_service(MethodFilter::GET, gql_subscription_service.clone()))
                    .layer(AddExtensionLayer::new(schema.clone()))
                    .layer(AddExtensionLayer::new(client_to_asjs.clone()));
                let schema2 = schema.clone();
                move |req: Request<Body>| {
                    let req_headers = req.headers().clone();
                    let schema3 = schema2.clone();
                    let graphql_router_layered = graphql_router_layered.clone();
                    async move {
                        // if we're on the "/gql-playground" page, always send the request to the app-server-rs' regular handler (ie. not using the proxy to app-server-js)
                        if let Some(referrer) = req_headers.get("Referer") {
                            let referrer_str = &String::from_utf8_lossy(referrer.as_bytes());
                            let referrer_url = Url::parse(referrer_str);
                            if let Ok(referrer_url) = referrer_url {
                                if referrer_url.path() == "/gql-playground" {
                                    println!(r#"Sending "/graphql" request to force_regular branch. @referrer:{}"#, referrer_str);
                                    let response_str = have_own_graphql_handle_request(req, schema3).await;

                                    // send response (to frontend)
                                    let mut response = Response::builder()
                                        .body(HttpBody::map_err(axum::body::Body::from(response_str), |e| axum::Error::new("Test")).boxed_unsync())
                                        .unwrap();
                                    response.headers_mut().append(CONTENT_TYPE, HeaderValue::from_static("content-type: application/json; charset=utf-8"));
                                    return Ok(response);
                                };
                            }
                        }
                        
                        println!(r#"Sending "/graphql" request to layered branch"#);
                        graphql_router_layered.oneshot(req).await.map_err(|err| match err {})
                    }
                }
            })*/
        )

        // for endpoints not defined by app-server-rs (eg. /check-mem), assume it is meant for app-server-js, and thus call the proxying function
        .fallback(get(maybe_proxy_to_asjs_handler).merge(post(maybe_proxy_to_asjs_handler)))
        .layer(AddExtensionLayer::new(schema))
        .layer(AddExtensionLayer::new(client_to_asjs));

    info!("Playground: http://localhost:[view readme]");
    result
}