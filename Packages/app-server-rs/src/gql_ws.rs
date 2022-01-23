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

#[derive(MergedObject, Default)]
struct QueryRoot(QueryShard_Users, /*QueryShard_UserHiddens*/);
#[derive(MergedObject, Default)]
struct MutationRoot(MutationShard_Users, /*MutationShard_UserHiddens*/);
#[derive(MergedSubscription, Default)]
struct SubscriptionRoot(SubscriptionShard_Users, SubscriptionShard_UserHiddens);
type RootSchema = Schema<QueryRoot, MutationRoot, SubscriptionRoot>;

async fn graphql_handler(schema: extract::Extension<RootSchema>, req: GraphQLRequest) -> GraphQLResponse {
    schema.execute(req.into_inner()).await.into()
}

async fn graphql_playground() -> impl IntoResponse {
    response::Html(playground_source(
        GraphQLPlaygroundConfig::new("/gql-playground").subscription_endpoint("/graphql"),
    ))
}

pub fn extend_router(app: Router, client: Client) -> Router {
    let schema = Schema::build(QueryRoot::default(), MutationRoot::default(), SubscriptionRoot::default())
        .data(client)
        //.data(connection)
        .finish();

    let result = app
        .route("/gql-playground", get(graphql_playground).post(graphql_handler))
        //.route("/graphql", post(gql_post::gqp_post_handler))
        //.route("/graphql", GraphQLSubscription::new(schema.clone()))
        .route("/graphql", on_service(MethodFilter::GET, GraphQLSubscription::new(schema.clone())).post(graphql_handler))
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