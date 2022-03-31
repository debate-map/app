use async_graphql::SimpleObject;
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
use serde_json::Serializer;
use tower::ServiceExt;
use tower_http::{cors::{CorsLayer, Origin, AnyOr}, services::ServeFile};
use std::{
    collections::{HashSet, HashMap, BTreeMap},
    net::{SocketAddr, IpAddr},
    sync::{Arc}, panic, backtrace::Backtrace, convert::Infallible, str::FromStr,
};
use tokio::{sync::{broadcast, Mutex, RwLock}, runtime::Runtime};
use flume::{Sender, Receiver, unbounded};
use tower_http::{services::ServeDir};

pub type AppStateWrapper = Arc<AppState>;
#[derive(Default)]
pub struct AppState {
    pub mtx_results: RwLock<Vec<Mtx>>,
}

wrap_slow_macros!{

// derived from struct in app-server-rs/.../mtx.rs
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Mtx {
    /// This field holds the timings of all sections in the root mtx-enabled function, as well as any mtx-enabled functions called underneath it (where the root mtx is passed).
    /// Entry's key is the "path" to the section, eg: root_func/part1/other_func/part3
    /// Entry's value is a tuple, containing the start-time and duration of the section, stored as fractional milliseconds.
    //pub section_lifetimes: IndexMap<String, (f64, f64)>,
    //pub section_lifetimes: IndexMap2<String, (f64, f64)>,

    // use BTreeMap so that the entries are sorted (alphabetically, by key)
    //pub section_lifetimes: BTreeMap<String, (f64, f64)>,

    // tell serde to serialize the HashMap using the ordered_map function, which collects the entries into a temporary BTreeMap (which is sorted)
    #[serde(serialize_with = "crate::utils::general::ordered_map")]
    pub section_lifetimes: HashMap<String, (f64, f64)>,
}

}

/*#[derive(Clone, Serialize, Deserialize)]
pub struct IndexMap2<K: std::hash::Hash + Eq, V>(IndexMap<K, V>);
use std::ops::{Deref, DerefMut};
impl<K: std::hash::Hash + Eq, V> Deref for IndexMap2<K, V> {
    type Target = IndexMap<K, V>;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
impl<K: std::hash::Hash + Eq, V> DerefMut for IndexMap2<K, V> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl<K: std::hash::Hash + Eq + Send + Sync, V: Send + Sync> async_graphql::OutputType for IndexMap2<K, V> {
    fn type_name() -> std::borrow::Cow< 'static,str>  {
        todo!()
    }
    fn create_type_info(registry: &mut async_graphql::registry::Registry) -> String {
        todo!()
    }
    fn resolve< 'life0, 'life1, 'life2, 'life3, 'async_trait>(& 'life0 self,ctx: & 'life1 async_graphql::ContextSelectionSet< 'life2> ,field: & 'life3 async_graphql::Positioned<async_graphql::parser::types::Field> ,) ->  core::pin::Pin<Box<dyn core::future::Future<Output = async_graphql::ServerResult<async_graphql::Value> > + core::marker::Send+ 'async_trait> >where 'life0: 'async_trait, 'life1: 'async_trait, 'life2: 'async_trait, 'life3: 'async_trait,Self: 'async_trait {
        todo!()
    }
}*/
/*impl<K: Send + Sync, V: Send + Sync> async_graphql::ContainerType for IndexMap2<K, V> {
    fn resolve_field< 'life0, 'life1, 'life2, 'async_trait>(& 'life0 self,ctx: & 'life1 async_graphql::Context< 'life2>) ->  core::pin::Pin<Box<dyn core::future::Future<Output = async_graphql::ServerResult<Option<async_graphql::Value> > > + core::marker::Send+ 'async_trait> >where 'life0: 'async_trait, 'life1: 'async_trait, 'life2: 'async_trait,Self: 'async_trait {
        todo!()
    }
}
impl<K: Send + Sync, V: Send + Sync> async_graphql::ObjectType for IndexMap2<K, V> {
}*/