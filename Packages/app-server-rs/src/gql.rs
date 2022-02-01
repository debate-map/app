use std::borrow::Cow;
use std::collections::HashMap;
use std::convert::Infallible;
use std::future::Future;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::{Schema, MergedObject, MergedSubscription, ObjectType, Data, Result, SubscriptionType};
use hyper::Body;
use hyper::client::HttpConnector;
use tokio_postgres::{Client};
use tower::Service;
use tower_http::cors::{CorsLayer, Origin};
use async_graphql::futures_util::task::{Context, Poll};
use async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use axum::http::Method;
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
use std::{convert::TryFrom, net::SocketAddr};
use futures_util::future::{BoxFuture, Ready};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{future, Sink, SinkExt, Stream, StreamExt, FutureExt};
use crate::db::_general::{MutationShard_General, QueryShard_General, SubscriptionShard_General};
use crate::{get_cors_layer};
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
use crate::db::users::{SubscriptionShard_User};
use crate::proxy_to_asjs::{proxy_to_asjs_handler, HyperClient};
use crate::store::storage::StorageWrapper;
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use crate::utils::async_graphql_axum_custom::{GraphQLSubscription, GraphQLProtocol, GraphQLWebSocket};

#[derive(MergedObject, Default)]
pub struct QueryRoot(QueryShard_General);
#[derive(MergedObject, Default)]
pub struct MutationRoot(MutationShard_General);
#[derive(MergedSubscription, Default)]
pub struct SubscriptionRoot(
    SubscriptionShard_General,
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
        .finish();

    let client_to_asjs = HyperClient::new();
    let gql_subscription_service = GraphQLSubscription::new(schema.clone());

    let result = app
        .route("/gql-playground", on_service(MethodFilter::POST, gql_subscription_service.clone()).get(graphql_playground))
        //.route("/graphql", post(gql_post::gqp_post_handler))
        //.route("/graphql", GraphQLSubscription::new(schema.clone()))
        .route("/graphql", post(proxy_to_asjs_handler).on_service(MethodFilter::GET, gql_subscription_service))
        // for endpoints not defined by app-server-rs, assume it is meant for app-server-js, and thus call the proxying function
        .fallback(get(proxy_to_asjs_handler).merge(post(proxy_to_asjs_handler)))
        .layer(AddExtensionLayer::new(schema))
        .layer(AddExtensionLayer::new(client_to_asjs));

    println!("Playground: http://localhost:8000");
    return result;
}