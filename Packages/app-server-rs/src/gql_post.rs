use async_graphql::Json;
use axum::{response::IntoResponse, http::StatusCode};

pub struct PostShape;

/*async fn gqp_post_handler(Json(payload): Json<PostShape>) -> impl IntoResponse {
    // this will be converted into a JSON response with a status code of `201 Created`
    (StatusCode::CREATED, Json("test1"))
}*/