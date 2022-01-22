use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::Schema;
use async_graphql_axum::{GraphQLRequest, GraphQLResponse, GraphQLSubscription};
use axum::http::Method;
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router, Server};
use tokio_postgres::tls::NoTlsStream;
use tokio_postgres::{Client, Connection, Socket};
use tower_http::cors::{CorsLayer, Origin};
use crate::db::users::{UsersSchema, MutationRoot, QueryRoot, Storage, SubscriptionRoot};
use crate::gql_post;

async fn graphql_handler(
    schema: extract::Extension<UsersSchema>,
    req: GraphQLRequest,
) -> GraphQLResponse {
    schema.execute(req.into_inner()).await.into()
}

async fn graphql_playground() -> impl IntoResponse {
    response::Html(playground_source(
        GraphQLPlaygroundConfig::new("/gql-playground").subscription_endpoint("/graphql"),
    ))
}

pub fn extend_router(app: Router, client: Client) -> Router {
    let schema = Schema::build(QueryRoot, MutationRoot, SubscriptionRoot)
        .data(Storage::default())
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