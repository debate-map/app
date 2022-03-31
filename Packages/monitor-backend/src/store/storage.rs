use axum::{
    response::{Html},
    routing::{get, any_service, post, get_service},
    AddExtensionLayer, Router, http::{
        Method,
        header::{CONTENT_TYPE}
    },
    headers::HeaderName, middleware, body::{BoxBody, boxed},
};
use hyper::{server::conn::AddrStream, service::{make_service_fn, service_fn}, Request, Body, Response, StatusCode, header::{FORWARDED, self}, Uri};
use indexmap::IndexMap;
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use tower::ServiceExt;
use tower_http::{cors::{CorsLayer, Origin, AnyOr}, services::ServeFile};
use std::{
    collections::HashSet,
    net::{SocketAddr, IpAddr},
    sync::{Arc}, panic, backtrace::Backtrace, convert::Infallible, str::FromStr,
};
use tokio::{sync::{broadcast, Mutex}, runtime::Runtime};
use flume::{Sender, Receiver, unbounded};
use tower_http::{services::ServeDir};

pub type AppStateWrapper = Arc<AppState>;
//#[derive(Default)]
pub struct AppState {
    pub mtx_results: Vec<Mtx>,
}

wrap_slow_macros!{

// derived from struct in app-server-rs/.../mtx.rs
#[derive(Serialize, Deserialize)]
pub struct Mtx {
    /// This field holds the timings of all sections in the root mtx-enabled function, as well as any mtx-enabled functions called underneath it (where the root mtx is passed).
    /// Entry's key is the "path" to the section, eg: root_func/part1/other_func/part3
    /// Entry's value is a tuple, containing the start-time and duration of the section, stored as fractional milliseconds.
    pub section_lifetimes: IndexMap<String, (f64, f64)>,
}

}