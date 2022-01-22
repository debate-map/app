use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::Schema;
use async_graphql_axum::{GraphQLRequest, GraphQLResponse, GraphQLSubscription};
use axum::response::{self, IntoResponse};
use axum::routing::get;
use axum::{extract, AddExtensionLayer, Router, Server};
use tokio_postgres::tls::NoTlsStream;
use tokio_postgres::{Client, Connection, Socket};
use crate::db::users::{UsersSchema, MutationRoot, QueryRoot, Storage, SubscriptionRoot};

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
        .route("/graphql", GraphQLSubscription::new(schema.clone()))
        .layer(AddExtensionLayer::new(schema));

    println!("Playground: http://localhost:8000");
    return result;
}