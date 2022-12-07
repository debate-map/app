use std::collections::HashMap;

use axum::http::Uri;

pub fn get_uri_params(uri: &Uri) -> HashMap<String, String> {
    let params: HashMap<String, String> = uri.query()
        .map(|v| url::form_urlencoded::parse(v.as_bytes()).into_owned().collect())
        .unwrap_or_else(HashMap::new);
    params
}