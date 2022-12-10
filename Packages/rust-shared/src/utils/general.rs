use std::{collections::HashMap, env};

use axum::http::Uri;

pub enum K8sEnv {
    Dev,
    Prod,
}
impl std::fmt::Debug for K8sEnv {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Dev => write!(f, "dev"),
            Self::Prod => write!(f, "prod"),
        }
    }
}

pub fn k8s_env() -> K8sEnv {
    match env::var("ENV").expect("An environment-variable named `ENV` must be provided, with value `dev` or `prod`.").as_str() {
        "dev" => K8sEnv::Dev,
        "prod" => K8sEnv::Prod,
        _ => panic!("The environment-variable named `ENV` must be either `dev` or `prod`."),
    }
}
pub fn k8s_dev() -> bool {
    match k8s_env() {
        K8sEnv::Dev => true,
        _ => false,
    }
}
pub fn k8s_prod() -> bool {
    match k8s_env() {
        K8sEnv::Prod => true,
        _ => false,
    }
}

pub fn get_uri_params(uri: &Uri) -> HashMap<String, String> {
    let params: HashMap<String, String> = uri.query()
        .map(|v| url::form_urlencoded::parse(v.as_bytes()).into_owned().collect())
        .unwrap_or_else(HashMap::new);
    params
}