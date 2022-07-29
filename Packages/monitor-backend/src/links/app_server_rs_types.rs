use std::collections::HashMap;

use async_graphql::{Object, SimpleObject};
use indexmap::IndexMap;
use serde::{Serialize, Deserialize};
use uuid::Uuid;

//wrap_slow_macros! {

// sync with "mtx.rs" in app-server-rs
// ==========

#[derive(SimpleObject)] // added in monitor-backend only

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MtxData {
    //pub id: Uuid,
    pub id: String, // changed to String here, for easier usage with gql in monitor-backend (agql's OutputType isn't implemented for Uuid)

    // use this in app-server-rs codebase
    //pub section_lifetimes: IndexMap<String, MtxSection>,

    // use this in monitor-backend codebase
    // use HashMap here, since agql has OutputType implemented for it
    // (but tell serde to serialize the HashMap using the ordered_map function, which collects the entries into a temporary BTreeMap -- which is sorted)
    #[serde(serialize_with = "crate::utils::general::ordered_map")]
    pub section_lifetimes: HashMap<String, MtxSection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MtxSection {
    pub path: String,
    pub extra_info: Option<String>,
    pub start_time: f64,
    pub duration: Option<f64>,
}

// sync with "logging.rs" in app-server-rs
// ==========

// keep fields synced with struct in logging.rs (this one's the "mirror")
#[derive(SimpleObject, Clone, Serialize, Deserialize, Debug, Default)]
pub struct LogEntry {
    pub time: f64,
    pub level: String,
    pub target: String,
    pub span_name: String,
    pub message: String,
}

// sync with "monitor_backend_link.rs" in app-server-rs
// ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message_MBToAS {
    //TODO,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message_ASToMB {
    LogEntryAdded { entry: LogEntry },
    MtxEntryDone { mtx: MtxData },
}

//}