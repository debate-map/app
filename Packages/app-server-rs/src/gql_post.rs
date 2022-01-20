/*async fn gqp_post_handler(Json(payload): Json<CreateUser>) -> impl IntoResponse {
    // insert your application logic here
    let user = User {
        id: 1337,
        username: payload.username,
    };

    // this will be converted into a JSON response with a status code of `201 Created`
    (StatusCode::CREATED, Json(user))
}*/