use axum::{
    body::{Body, Bytes},
    http::{Request, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::post,
    Router,
};
use std::net::SocketAddr;

/*pub fn get_axum_logging_layer() -> FromFnLayer<fn(hyper::Request<Body>, axum::middleware::Next<Body>) -> impl futures_util::Future<Output = Result<impl IntoResponse, (StatusCode, String)>>> {
    middleware::from_fn(print_request_response)
}*/

pub async fn print_request_response(
    req: Request<Body>,
    next: Next<Body>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let (parts, body) = req.into_parts();
    let bytes = buffer_and_print("request", body).await?;
    let req = Request::from_parts(parts, Body::from(bytes));

    let res = next.run(req).await;

    let (parts, body) = res.into_parts();
    let bytes = buffer_and_print("response", body).await?;
    let res2 = Response::from_parts(parts, Body::from(bytes));

    Ok(res2)
}

pub async fn buffer_and_print<B>(direction: &str, body: B) -> Result<Bytes, (StatusCode, String)>
where
    B: axum::body::HttpBody<Data = Bytes>,
    B::Error: std::fmt::Display,
{
    let bytes = match hyper::body::to_bytes(body).await {
        Ok(bytes) => bytes,
        Err(err) => {
            return Err((
                StatusCode::BAD_REQUEST,
                format!("failed to read {} body: {}", direction, err),
            ));
        }
    };

    if let Ok(body) = std::str::from_utf8(&bytes) {
        //tracing::debug!("{} body = {:?}", direction, body);
        println!("{} body = {:?}", direction, body);
    }

    Ok(bytes)
}