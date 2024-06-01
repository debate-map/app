use axum::{
	http::{header::CONTENT_TYPE, Method},
	response::Html,
	routing::{any_service, get, get_service, post},
	Router,
};
use rust_shared::flume::{unbounded, Receiver, Sender};
use rust_shared::hyper::{
	header::{self, FORWARDED},
	service::service_fn,
	Request, Response, StatusCode, Uri,
};
use rust_shared::indexmap::IndexMap;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::Serializer;
use rust_shared::tokio::{
	runtime::Runtime,
	sync::{broadcast, Mutex, RwLock},
};
use rust_shared::uuid::Uuid;
use rust_shared::{
	async_graphql,
	async_graphql::{Json, SimpleObject},
	utils::{
		mtx::mtx::MtxData,
		type_aliases::{JSONValue, RowData},
	},
};
use rust_shared::{axum, futures, tower, tower_http};
use std::{
	backtrace::Backtrace,
	collections::{BTreeMap, HashMap, HashSet},
	convert::Infallible,
	net::{IpAddr, SocketAddr},
	panic,
	str::FromStr,
	sync::Arc,
};
use tower::ServiceExt;
use tower_http::services::ServeDir;
use tower_http::{cors::CorsLayer, services::ServeFile};

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
