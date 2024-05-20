use std::{sync::{Arc, RwLock, RwLockWriteGuard}, cell::RefCell, time::{Instant, Duration}, borrow::Cow, rc::Rc, collections::HashMap};

use crate::utils::{general_::extensions::ToOwnedV, type_aliases::{FReceiver, FSender, JSONValue}};
use anyhow::Error;
use async_graphql::SimpleObject;
use once_cell::sync::{OnceCell, Lazy};
use serde_json;
use tokio;
use flume::{Sender, Receiver};

use crate::hyper::{Method, Request};
use indexmap::IndexMap;
use crate::rust_macros::wrap_slow_macros;
use crate::utils::time::time_since_epoch_ms;
use crate::serde::{Serialize, Deserialize};
use crate::serde_json::{json, Map};
use crate::tokio::{time};
use tracing::{trace, error, info, warn};
use crate::uuid::Uuid;

#[macro_export]
macro_rules! fn_name {
    () => {{
        fn f() {}
        fn type_name_of<T>(_: T) -> &'static str {
            std::any::type_name::<T>()
        }
        let name = type_name_of(f);
        let mut result = &name[..name.len() - 3];

        // trim "::{{closure}}" from the end, if present (such is present for async functions)
        result = result.trim_end_matches("::{{closure}}");

        // trim path to function from func-name (eg: trims "my::path::my_func" to "my_func")
        if let Some(pos) = &result.rfind(':') {
            result = &result[pos + 1..];
        }

        result
    }}
}
pub use fn_name;

#[macro_export]
macro_rules! new_mtx {
    ($mtx:ident, $first_section_name:expr) => {
        $crate::utils::mtx::mtx::new_mtx!($mtx, $first_section_name, None);
    };
    ($mtx:ident, $first_section_name:expr, $parent_mtx:expr) => {
        $crate::utils::mtx::mtx::new_mtx!($mtx, $first_section_name, $parent_mtx, None);
    };
    ($mtx:ident, $first_section_name:expr, $parent_mtx:expr, $extra_info:expr) => {
        let parent_mtx: Option<&$crate::utils::mtx::mtx::Mtx> = $parent_mtx;
        #[allow(unused_mut)]
        let mut $mtx = $crate::utils::mtx::mtx::Mtx::new($crate::utils::mtx::mtx::fn_name!(), $first_section_name, parent_mtx, $extra_info);
    };
}
pub use new_mtx;

pub enum MtxMessage {
    /// tuple.0 is the section's path and time (see section_lifetimes description); tuple.1 is the SectionLifetime struct, with times as ms-since-epoch
    UpdateSectionLifetime(String, MtxSection),
}
impl MtxMessage {
    pub fn apply_messages_to_mtx_data(
        mtx_section_lifetimes: &Arc<RwLock<IndexMap<String, MtxSection>>>,
        messages: impl Iterator<Item = MtxMessage>
    ) {
        let mut section_lifetimes = mtx_section_lifetimes.write().unwrap();
        for msg in messages {
            msg.apply_to_mtx_data(&mut section_lifetimes);
        }
    }
    pub fn apply_to_mtx_data(self,
        section_lifetimes_ref: &mut RwLockWriteGuard<IndexMap<String, MtxSection>>
    ) {
        match self {
            MtxMessage::UpdateSectionLifetime(path_and_time, lifetime) => {
                section_lifetimes_ref.insert(path_and_time, lifetime);
            }
        }
    }
}

#[derive(Debug)]
pub struct Mtx {
    pub id: Arc<Uuid>,
    pub func_name: String,
    pub path_from_root_mtx: String,
    pub current_section: MtxSection,
    pub section_lifetimes: Arc<RwLock<IndexMap<String, MtxSection>>>,
    pub msg_sender: Sender<MtxMessage>,
    pub msg_receiver: Receiver<MtxMessage>,
    pub root_mtx_sender: Sender<MtxMessage>,
    pub root_mtx_id_arc_for_keepalive: Arc<Uuid>,
}
//pub static mtx_none: Arc<Mtx> = Arc::new(Mtx::new("n/a"));
impl Mtx {
    pub fn new(func_name: &str, first_section_name: impl Into<Cow<'static, str>>, parent: Option<&Mtx>, extra_info: Option<String>) -> Self {
        let (msg_sender, msg_receiver): (Sender<MtxMessage>, Receiver<MtxMessage>) = flume::unbounded();
        let root_mtx_sender = match parent {
            Some(parent) => parent.root_mtx_sender.clone(),
            None => msg_sender.clone(),
        };
        let id_arc = Arc::new(Uuid::new_v4());
        let id_arc_first_clone = id_arc.clone();
        let new_self = Self {
            id: id_arc,
            func_name: func_name.to_owned(),
            path_from_root_mtx: "".o(),
            current_section: MtxSection { path: "[temp placeholder]".to_string(), start_time: 0f64, extra_info: None, duration: None },
            section_lifetimes: Arc::new(RwLock::new(IndexMap::new())),
            msg_sender,
            msg_receiver,
            root_mtx_sender,
            // fix for issue of root-mtx update-receiving-loop (see tokio::spawn block below) being dropped while proxy was still sending more data to it
            root_mtx_id_arc_for_keepalive: match parent {
                Some(parent) => parent.root_mtx_id_arc_for_keepalive.clone(),
                None => id_arc_first_clone,
            }
        };

        new_self
    }

    pub fn proxy(&self, /*keep_parent_alive: bool*/) -> Mtx {
        Mtx::new("<proxy>", "<only section>", Some(&self), None)
    }
    pub fn is_root_mtx(&self) -> bool { true }
    pub fn section(&mut self, name: impl Into<Cow<'static, str>>) {}
    pub fn section_2(&mut self, name: impl Into<Cow<'static, str>>, extra_info: Option<String>) {}
    pub fn log_call(&self, temp_extra_info: Option<String>) {}
}

pub async fn package_up_mtx_data_and_send_to_channel(id: Arc<Uuid>, section_lifetimes: Arc<RwLock<IndexMap<String, MtxSection>>>, last_data_as_str: Option<String>) -> Option<String> {
    Some("".o())
}

pub enum MtxGlobalMsg {
    NotifyMtxDataPossiblyChanged(MtxDataWithExtraInfo),
}
pub static MTX_GLOBAL_MESSAGE_SENDER_AND_RECEIVER: OnceCell<(FSender<MtxGlobalMsg>, FReceiver<MtxGlobalMsg>)> = OnceCell::new();

pub fn json_obj_1field<T: Serialize>(field_name: &str, field_value: T) -> Result<JSONValue, Error> {
    let mut obj = serde_json::Map::new();
    //obj[field_name] = field_value;
    obj.insert(field_name.to_string(), serde_json::to_value(field_value)?);
    return Ok(JSONValue::Object(obj));
}

pub const MTX_FINAL_SECTION_NAME: &'static str = "$end-marker$";
impl MtxSection {
    pub fn get_key(&self) -> String { "".o() }
}

// this alias is needed, since `wrap_serde_macros.rs` inserts refs to, eg. `rust_shared::rust_macros::Serialize_Stub`
use crate as rust_shared;

wrap_slow_macros! {

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MtxSection {
    pub path: String,
    pub extra_info: Option<String>,
    pub start_time: f64,
    pub duration: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MtxData {
    pub id: String,
    pub section_lifetimes: IndexMap<String, MtxSection>,
}
impl MtxData {
    async fn from(
        id: Arc<Uuid>,
        section_lifetimes: Arc<RwLock<IndexMap<String, MtxSection>>>,
    ) -> MtxData {
        let section_lifetimes = section_lifetimes.read().unwrap();
        MtxData {
            id: (*id).to_string(),
            section_lifetimes: (*section_lifetimes).clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MtxDataWithExtraInfo {
    pub id: String,
    pub section_lifetimes: IndexMap<String, MtxSection>,
    pub data_as_str: String,
    pub last_data_as_str: Option<String>,
}

#[derive(SimpleObject)] // added for AGQL variant only
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MtxDataForAGQL {
    pub id: String,
    #[serde(serialize_with = "crate::utils::general_::serde::ordered_map")]
    pub section_lifetimes: HashMap<String, MtxSection>,
}
impl MtxDataForAGQL {
    pub fn from_base(mtx_data: &MtxData) -> MtxDataForAGQL {
        let mtx_data_as_str = serde_json::to_string(&mtx_data).unwrap();
        let mtx_data_for_agql: MtxDataForAGQL = serde_json::from_str(&mtx_data_as_str).unwrap();
        mtx_data_for_agql
    }
}

}