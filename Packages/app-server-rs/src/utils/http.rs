/*async fn clone_request(req: Request<Body>) -> (Request<Body>, Request<Body>) {
    let (parts, body) = req.into_parts();
    //clone_request_from_parts(parts, body, "sdf".to_owned()).await
    clone_request_from_parts(parts, body).await
}
async fn clone_request_from_parts(
    parts: http::request::Parts, body: hyper::Body,
    // modifications
    //new_url: String
) -> (Request<Body>, Request<Body>) {
    let new_url = parts.uri;

    let entire_body_as_vec = body
        .try_fold(Vec::new(), |mut data, chunk| async move {
            data.extend_from_slice(&chunk);
            Ok(data)
        }).await;

    let body_str = String::from_utf8(entire_body_as_vec.unwrap()).expect("response was not valid utf-8");
    let mut request_builder_1 = Request::builder().uri(new_url.clone()).method(parts.method.as_str());
    let mut request_builder_2 = Request::builder().uri(new_url).method(parts.method.as_str());

    for (header_name, header_value) in parts.headers.iter() {
        request_builder_1 = request_builder_1.header(header_name.as_str(), header_value);
        request_builder_2 = request_builder_2.header(header_name.as_str(), header_value);
    }

    let req1 = request_builder_1
        .body(Body::from(body_str.clone()))
        .unwrap();
    let req2 = request_builder_2
        .body(Body::from(body_str.clone()))
        .unwrap();

    (req1, req2)
}*/