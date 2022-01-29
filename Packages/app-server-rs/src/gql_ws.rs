use std::borrow::Cow;
use std::collections::HashMap;
use std::convert::Infallible;
use std::future::Future;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::{Schema, MergedObject, MergedSubscription, ObjectType, Data, Result, SubscriptionType};
use axum::http::Method;
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router};
use tokio_postgres::{Client};
use tower::Service;
use tower_http::cors::{CorsLayer, Origin};
use async_graphql::futures_util::task::{Context, Poll};
use async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use axum::body::{boxed, BoxBody, HttpBody};
use axum::extract::ws::{CloseFrame, Message};
use axum::extract::{FromRequest, RequestParts, WebSocketUpgrade};
use axum::http::{self, Request, Response, StatusCode};
use axum::Error;
use futures_util::future::{BoxFuture, Ready};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{future, Sink, SinkExt, Stream, StreamExt, FutureExt};
use crate::db::access_policies::SubscriptionShard_AccessPolicy;
use crate::db::command_runs::SubscriptionShard_CommandRun;
use crate::db::feedback_proposals::SubscriptionShard_Proposal;
use crate::db::feedback_user_infos::SubscriptionShard_UserInfo;
use crate::db::global_data::SubscriptionShard_GlobalData;
use crate::db::map_node_edits::SubscriptionShard_MapNodeEdit;
use crate::db::maps::SubscriptionShard_Map;
use crate::db::medias::SubscriptionShard_Media;
use crate::db::node_child_links::SubscriptionShard_NodeChildLink;
use crate::db::node_phrasings::SubscriptionShard_MapNodePhrasing;
use crate::db::node_ratings::SubscriptionShard_NodeRating;
use crate::db::node_revisions::SubscriptionShard_MapNodeRevision;
use crate::db::node_tags::SubscriptionShard_MapNodeTag;
use crate::db::nodes::SubscriptionShard_MapNode;
use crate::db::shares::SubscriptionShard_Share;
use crate::db::terms::SubscriptionShard_Term;
use crate::db::user_hiddens::{SubscriptionShard_UserHidden};
use crate::db::users::{QueryShard_User, MutationShard_User, SubscriptionShard_User};
use crate::gql_post::graphql_post_handler;
use crate::store::storage::StorageWrapper;
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use crate::utils::async_graphql_axum_custom::{GraphQLSubscription, GraphQLProtocol, GraphQLWebSocket};
//use async_graphql_axum::{GraphQLSubscription, GraphQLRequest, GraphQLResponse, GraphQLProtocol, GraphQLWebSocket};
//use crate::utils::gql_general_extension::{CustomExtension, CustomExtensionCreator};
//use tokio::sync::Mutex;

#[derive(MergedObject, Default)]
pub struct QueryRoot(QueryShard_User, /*QueryShard_UserHidden*/);
#[derive(MergedObject, Default)]
pub struct MutationRoot(MutationShard_User, /*MutationShard_UserHidden*/);
#[derive(MergedSubscription, Default)]
pub struct SubscriptionRoot(
    SubscriptionShard_User, SubscriptionShard_UserHidden,
    SubscriptionShard_GlobalData, SubscriptionShard_Map,
    SubscriptionShard_Term, SubscriptionShard_AccessPolicy, SubscriptionShard_Media,
    SubscriptionShard_CommandRun, SubscriptionShard_Proposal, SubscriptionShard_UserInfo,
    SubscriptionShard_MapNode, SubscriptionShard_NodeChildLink, SubscriptionShard_MapNodeEdit,
    SubscriptionShard_MapNodePhrasing, SubscriptionShard_NodeRating, SubscriptionShard_MapNodeRevision, SubscriptionShard_MapNodeTag,
    SubscriptionShard_Share,
);
pub type RootSchema = Schema<QueryRoot, MutationRoot, SubscriptionRoot>;

async fn graphql_playground() -> impl IntoResponse {
    response::Html(playground_source(
        GraphQLPlaygroundConfig::new("/gql-playground").subscription_endpoint("/graphql"),
    ))
}

pub fn extend_router(app: Router, client: Client, storage_wrapper: StorageWrapper) -> Router {
    let schema = Schema::build(QueryRoot::default(), MutationRoot::default(), SubscriptionRoot::default())
        .data(client)
        .data(storage_wrapper)
        //.data(connection)
        //.extension(CustomExtensionCreator::new())
        .finish();

    let result = app
        .route("/gql-playground", post(graphql_post_handler).get(graphql_playground))
        //.route("/graphql", post(gql_post::gqp_post_handler))
        //.route("/graphql", GraphQLSubscription::new(schema.clone()))
        .route("/graphql", post(graphql_post_handler).on_service(MethodFilter::GET, GraphQLSubscription::new(schema.clone())))
        .layer(
            // ref: https://docs.rs/tower-http/latest/tower_http/cors/index.html
            CorsLayer::new()
                //.allow_origin(any())
                .allow_origin(Origin::predicate(|_, _| { true })) // must use true (ie. have response's "allowed-origin" always equal the request origin) instead of "*", since we have credential-inclusion enabled
                //.allow_methods(any()),
                //.allow_methods(vec![Method::GET, Method::HEAD, Method::PUT, Method::PATCH, Method::POST, Method::DELETE])
                //.allow_methods(vec![Method::GET, Method::POST])
                .allow_methods(vec![Method::GET, Method::POST])
                .allow_headers(vec![CONTENT_TYPE]) // to match with express server (probably unnecessary)
                .allow_credentials(true),
        )
        .layer(AddExtensionLayer::new(schema));

    println!("Playground: http://localhost:8000");
    return result;
}