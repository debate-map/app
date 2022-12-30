use rust_shared::{async_graphql, async_graphql::{SimpleObject, Json}, utils::{mtx::mtx::MtxData, type_aliases::{JSONValue, RowData}}};
use rust_shared::{futures, axum, tower, tower_http};
use axum::{
    response::{Html},
    routing::{get, any_service, post, get_service},
    AddExtensionLayer, Router, http::{
        Method,
        header::{CONTENT_TYPE}
    },
    headers::HeaderName, middleware, body::{BoxBody, boxed},
};
use rust_shared::hyper::{server::conn::AddrStream, service::{make_service_fn, service_fn}, Request, Body, Response, StatusCode, header::{FORWARDED, self}, Uri};
use rust_shared::indexmap::IndexMap;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::Serializer;
use tower::ServiceExt;
use tower_http::{cors::{CorsLayer, Origin, AnyOr}, services::ServeFile};
use rust_shared::uuid::Uuid;
use std::{
    collections::{HashSet, HashMap, BTreeMap},
    net::{SocketAddr, IpAddr},
    sync::{Arc}, panic, backtrace::Backtrace, convert::Infallible, str::FromStr,
};
use rust_shared::tokio::{sync::{broadcast, Mutex, RwLock}, runtime::Runtime};
use rust_shared::flume::{Sender, Receiver, unbounded};
use tower_http::{services::ServeDir};

pub type AppStateArc = Arc<AppState>;
#[derive(Default)]
pub struct AppState {
    //pub mtx_results: RwLock<Vec<Mtx>>,
    pub mtx_results: RwLock<Vec<MtxData>>,
    pub lqi_data: RwLock<HashMap<String, LQInstance_Partial>>,
}

#[derive(SimpleObject)] // in monitor-backend only
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LQInstance_Partial {
    pub table_name: String,
    pub filter: JSONValue,
    //pub last_entries: Vec<RowData>,
    pub last_entries: Json<Vec<RowData>>,
    pub entry_watcher_count: usize,
}

/*wrap_slow_macros!{

// derived from struct in app-server/.../mtx.rs
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Mtx {
    //pub id: Arc<Uuid>,
    pub id: String, // changed to String, since agql's OutputType is not implemented for Uuid

    // tell serde to serialize the HashMap using the ordered_map function, which collects the entries into a temporary BTreeMap (which is sorted)
    #[serde(serialize_with = "crate::utils::general::ordered_map")]
    pub section_lifetimes: HashMap<String, MtxSection>,
}

}*/