use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::{Schema, MergedObject, MergedSubscription};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse, GraphQLSubscription};
use axum::http::Method;
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router};
use tokio_postgres::{Client};
use tower_http::cors::{CorsLayer, Origin};
use crate::db::user_hiddens::{SubscriptionShard_UserHiddens};
use crate::db::users::{QueryShard_Users, MutationShard_Users, SubscriptionShard_Users};
use crate::gql_ws::RootSchema;

pub struct PostShape;

/*async fn gqp_post_handler(Json(payload): Json<PostShape>) -> impl IntoResponse {
    // this will be converted into a JSON response with a status code of `201 Created`
    (StatusCode::CREATED, Json("test1"))
}*/

pub async fn graphql_post_handler(schema: extract::Extension<RootSchema>, req: GraphQLRequest) -> GraphQLResponse {
    // todo: add splitting logic (based on type of request), between executing mutation in our Rust schema, vs proxying to app-server-js
    
    schema.execute(req.into_inner()).await.into()
}