use std::convert::Infallible;
use std::net::{IpAddr, Ipv4Addr};
use hyper::server::conn::AddrStream;
use hyper::{client::HttpConnector, Body, Server, StatusCode};
use hyper::client::{Client};
use hyper::service::{service_fn, make_service_fn};
use axum::extract::{FromRequest, RequestParts, Extension};
use axum::http::Method;
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router};
use axum::http::{uri::Uri, Request, Response};
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::{Schema, MergedObject, MergedSubscription};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse, GraphQLSubscription};
use std::{convert::TryFrom, net::SocketAddr};
use hyper_reverse_proxy::ProxyError;
use tower_http::cors::{CorsLayer, Origin};
use crate::db::user_hiddens::{SubscriptionShard_UserHidden};
use crate::db::users::{QueryShard_User, MutationShard_User, SubscriptionShard_User};
use crate::gql::RootSchema;
use futures::future::{self, Future};


/*type BoxFut = Box<Future<Item=Response<Body>, Error=hyper::Error> + Send>;
fn debug_request(req: Request<Body>) -> BoxFut {
    let body_str = format!("{:?}", req);
    let response = Response::new(Body::from(body_str));
    Box::new(future::ok(response))
}*/

/*pub struct PostShape;
async fn gqp_post_handler(Json(payload): Json<PostShape>) -> impl IntoResponse {
    // this will be converted into a JSON response with a status code of `201 Created`
    (StatusCode::CREATED, Json("test1"))
}*/

/*pub async fn graphql_post_handler(schema: extract::Extension<RootSchema>, req: Request<Body>) -> Response<Body> {
    println!("Got post request:{:?}", req);

    let for_rust_server = false;
    match for_rust_server {
        false => {
            let remote_addr = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)); // temp
            let subresult = hyper_reverse_proxy::call(remote_addr, "http://127.0.0.1:3155", req).await;
            match subresult {
                Ok(result) => result,
                Err(err) => {
                    //panic!("Got error:{:?}", err);
                    let error_info = match err {
                        ProxyError::ForwardHeaderError => "ForwardHeaderError".to_owned(),
                        ProxyError::HyperError(msg) => format!("HyperError:{}", msg.to_string()),
                        ProxyError::InvalidUri(uri) => format!("ForwardHeaderError:{}", uri),
                    };
                    panic!("Got error in graphql_post_handler:{}", error_info);
                },
            }
        },
        true => {
            let mut request_parts_converted = RequestParts::new(req);
            let request_converted = match GraphQLRequest::from_request(&mut request_parts_converted).await {
                Ok(new_req) => new_req,
                Err(err) => panic!("Got error converting request to GraphQL request."),
            };

            // approach 1: casting to GraphQLResponse, then processing
            // ==========

            /*let from_response_async_graphql = schema.execute(request_converted.into_inner()).await;
            let from_response_graphql: GraphQLResponse = from_response_async_graphql.into();
            let from_response = from_response_graphql.into_response();
            let (from_head, from_body) = from_response.into_parts();
            let mut builder = Response::builder().status(from_head.status);
            //let headers = builder.headers_mut().unwrap();
            for (key, header) in from_head.headers {
                //headers.insert(key, *header);
                builder = builder.header(key.unwrap(), header);
            }
            let body: Body = Body::empty();
            // todo: add body from from_body
            let response = builder.body(body).unwrap();
            response*/

            // approach 2: processing GraphQLResponse directly
            // ==========

            let from_response = schema.execute(request_converted.into_inner()).await;
            let from_response_body_as_str = from_response.data.into_json().unwrap().to_string();

            let mut builder = Response::builder().status(StatusCode::OK);
            //let headers = builder.headers_mut().unwrap();
            for (key, header) in from_response.http_headers {
                //headers.insert(key, *header);
                builder = builder.header(key.unwrap(), header);
            }

            let body: Body = Body::from(from_response_body_as_str);
            let response = builder.body(body).unwrap();
            response
        }
    }
}*/

pub type HyperClient = hyper::client::Client<HttpConnector, Body>;

pub async fn graphql_post_handler(Extension(client): Extension<HyperClient>, mut req: Request<Body>) -> Response<Body> {
    let path = req.uri().path();
    let path_query = req
        .uri()
        .path_and_query()
        .map(|v| v.as_str())
        .unwrap_or(path);

    //let uri = format!("http://127.0.0.1:3155{}", path_query);
    let uri = format!("http://dm-app-server-js.default.svc.cluster.local:3155{}", path_query);

    *req.uri_mut() = Uri::try_from(uri).unwrap();

    client.request(req).await.unwrap()
}