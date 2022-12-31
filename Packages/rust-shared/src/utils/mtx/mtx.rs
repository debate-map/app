use std::{sync::{Arc, RwLock, RwLockWriteGuard}, cell::RefCell, time::{Instant, Duration}, borrow::Cow, rc::Rc, collections::HashMap};

use crate::utils::type_aliases::{JSONValue, FSender, FReceiver};
use anyhow::Error;
use async_graphql::SimpleObject;
use once_cell::sync::{OnceCell, Lazy};
use serde_json;
use tokio;
use flume::{Sender, Receiver};

use crate::hyper::{Client, Method, Request, Body};
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

/*pub fn new_mtx_impl<'a>(fn_name_final: &str, first_section_name: &str, parent_mtx: Option<&'a mut Mtx>) -> (Option<Mtx>, Option<&'a mut Mtx>) {
    let mut mtx = Mtx::new(fn_name_final);
    mtx.section(first_section_name);
    if let Some(parent_mtx) = parent_mtx {
        let mtx_borrow = parent_mtx.add_sub(mtx);
        return (None, Some(mtx_borrow));
    } else {
        return (Some(mtx), None);
        /*let mtx_borrow = &mut mtx;
        return (None, Some(mtx_borrow));*/
    }
}*/
/*pub fn new_mtx_impl<'a>(fn_name_final: &str, first_section_name: &str, parent_mtx: &'a mut Mtx) -> &'a mut Mtx {
    let mut mtx = Mtx::new(fn_name_final);
    mtx.section(first_section_name);
    let mtx_borrow = parent_mtx.add_sub(mtx);
    return mtx_borrow;
}*/
/*pub fn new_mtx_impl<'a>(fn_name_final: &str, first_section_name: &str) -> Mtx {
    let mut mtx = Mtx::new(fn_name_final);
    mtx.section(first_section_name);
    mtx
}*/

pub enum MtxMessage {
    /// tuple.0 is the section's path and time (see section_lifetimes description); tuple.1 is the SectionLifetime struct, with times as ms-since-epoch
    UpdateSectionLifetime(String, MtxSection),
}
impl MtxMessage {
    pub fn apply_messages_to_mtx_data(
        mtx_section_lifetimes: &Arc<RwLock<IndexMap<String, MtxSection>>>,
        //mtx_section_lifetimes: &Arc<flurry::HashMap<String, MtxSection>>,
        messages: impl Iterator<Item = MtxMessage>
    ) {
        let mut section_lifetimes = mtx_section_lifetimes.write().unwrap();
        /*let guard = mtx_section_lifetimes.guard();
        let section_lifetimes = mtx_section_lifetimes.with_guard(&guard);*/
        for msg in messages {
            msg.apply_to_mtx_data(&mut section_lifetimes);
        }
    }
    pub fn apply_to_mtx_data(self,
        section_lifetimes_ref: &mut RwLockWriteGuard<IndexMap<String, MtxSection>>
        //section_lifetimes_ref: &flurry::HashMapRef<String, MtxSection>
    ) {
        match self {
            MtxMessage::UpdateSectionLifetime(path_and_time, lifetime) => {
                section_lifetimes_ref.insert(path_and_time, lifetime);
            }
        }
    }
}

//#[derive(Serialize)]
#[derive(Debug)]
pub struct Mtx {
    pub id: Arc<Uuid>,
    pub func_name: String,
    /// Note that the "path_from_root_mtx" may not be unique! (eg. if root-func calls the same nested-func twice, in same section)
    pub path_from_root_mtx: String,
    //pub extra_info: String,

    pub current_section: MtxSection,
    /// This field holds the timings of all sections in the root mtx-enabled function, as well as any mtx-enabled functions called underneath it (where the root mtx is passed).
    /// Entry's key is the "path" to the section + ";" + the section's start-time, eg: root_func/part1/other_func/part3;1649321920506.4802
    /// Entry's value is `SectionLifetime` struct, containing the start-time and duration of the section (stored as fractional milliseconds), etc.
    pub section_lifetimes: Arc<RwLock<IndexMap<String, MtxSection>>>,
    //pub section_lifetimes: Arc<flurry::HashMap<String, MtxSection>>,

    // communication helpers
    pub msg_sender: Sender<MtxMessage>,
    pub msg_receiver: Receiver<MtxMessage>,

    //pub parent: Option<&'a mut Mtx<'b, 'b>>,
    //pub parent: Option<&'a RefCell<Self>>,
    //#[serde(skip)] pub parent_sender: Option<Sender<MtxMessage>>,
    pub root_mtx_sender: Sender<MtxMessage>,

    // todo: probably clean up how this is implemented
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
        let path_from_root_mtx = match parent {
            Some(parent) => format!("{}/{}", parent.current_section.path, func_name),
            None => func_name.to_owned(),
        };

        let id_arc = Arc::new(Uuid::new_v4());
        let id_arc_first_clone = id_arc.clone();
        let mut new_self = Self {
            id: id_arc,
            func_name: func_name.to_owned(),
            path_from_root_mtx,
            //extra_info,

            // the value of this doesn't matter; it gets overwritten by start_new_section below
            current_section: MtxSection { path: "[temp placeholder]".to_string(), start_time: 0f64, extra_info: None, duration: None },

            section_lifetimes: Arc::new(RwLock::new(IndexMap::new())),
            //section_lifetimes: Arc::new(flurry::HashMap::new()),
            msg_sender,
            msg_receiver,
            //parent: None,
            /*parent_sender: match parent {
                Some(parent) => Some(parent.msg_sender.clone()),
                None => None,
            },*/
            root_mtx_sender,

            // fix for issue of root-mtx update-receiving-loop (see tokio::spawn block below) being dropped while proxy was still sending more data to it
            root_mtx_id_arc_for_keepalive: match parent {
                Some(parent) => parent.root_mtx_id_arc_for_keepalive.clone(),
                None => id_arc_first_clone,
            }
        };
        new_self.start_new_section(&first_section_name.into(), extra_info, time_since_epoch_ms());

        if new_self.is_root_mtx() && !cfg!(test) {
            // start a timer that, once per second (while the mtx-instance is active/in-scope), sends its data to the backend
            let (id_clone, section_lifetimes_clone, msg_receiver_clone) = (new_self.id.clone(), new_self.section_lifetimes.clone(), new_self.msg_receiver.clone());
            tokio::spawn(async move {
                let mut interval = time::interval(time::Duration::from_secs(1));
                let mut last_data_as_str: Option<String> = None;
                loop {
                    interval.tick().await;

                    // if this is the first iteration, wait a bit
                    // (this wait appears to give time for the mtx-instance to be bound to a scope or something, such that the strong_count() call sees the remove strong-reference we expect)
                    if last_data_as_str.is_none() {
                        time::sleep(Duration::from_millis(1000)).await;
                    }

                    // process any messages that have buffered up
                    MtxMessage::apply_messages_to_mtx_data(&section_lifetimes_clone, msg_receiver_clone.drain());

                    // package data and send to channel (which user-project can decide what to do with)
                    let data_as_str = package_up_mtx_data_and_send_to_channel(id_clone.clone(), section_lifetimes_clone.clone(), last_data_as_str).await;
                    
                    last_data_as_str = data_as_str;
                    //println!("Sent partial results for mtx entry..."); // temp
                    
                    // if we're the last place holding a reference to the root-mtx's id-arc, the entire tree of mtx-instances must have been dropped by now (since each mtx-instance holds a reference to its tree's root id-arc);
                    //     that means it has already sent its final results to the monitor-backend (through the `Drop::drop` implementation), so we can end this loop
                    if Arc::strong_count(&id_clone) <= 1 {
                        if Arc::strong_count(&section_lifetimes_clone) > 1 {
                            warn!("Despite all refs to root-mtx's id-arc (other than receiver loop) having dropped, the section-lifetimes-arc still has other refs! This is unexpected. Receiver loop is proceeding with shutdown anyway, but worth investigating.");
                        }
                        //println!("Stopping mtx-data-sending timer, since mtx instance has been dropped."); // temp
                        break;
                    }
                }
            });
        }

        new_self
    }

    /// Use this when you want to collect mtx data from some async function (or otherwise uncontrolled call-path). Basically, it's made for cases where you can neither:
    /// 1) ..."move" the mtx to pass as an argument (due to there being local mtx-sections after the relevant call)
    /// 2) ...nor can you "borrow" it to pass by reference (since the call-tree is uncontrolled/async, so rust's borrow-checker can't verify the lifetimes)
    /// Usage example:
    /// ```
    /// new_mtx!(mtx, "1:section one", None);
    /// uncontrolled_call_path(Some(mtx.proxy())).await;
    /// mtx.section("2:section two");
    /// something_else();
    /// ```
    pub fn proxy(&self, /*keep_parent_alive: bool*/) -> Mtx {
        Mtx::new("<proxy>", "<only section>", Some(&self), None)
    }

    pub fn is_root_mtx(&self) -> bool {
        !self.path_from_root_mtx.contains("/")
    }
    /*pub fn current_section_path(&self) -> String {
        format!("{}/{}", self.path_from_root_mtx, self.current_section_name)
    }*/
    pub fn section(&mut self, name: impl Into<Cow<'static, str>>) {
        self.section_2(name, None);
    }
    pub fn section_2(&mut self, name: impl Into<Cow<'static, str>>, extra_info: Option<String>) {
        let old_section_end_time = self.end_old_section();
        self.start_new_section(&name.into(), extra_info, old_section_end_time);
    }
    fn end_old_section(&mut self) -> f64 {
        let old_section = &mut self.current_section;
        let section_end_time = time_since_epoch_ms();
        old_section.duration = Some(section_end_time - old_section.start_time);

        {
            let mut section_lifetimes = self.section_lifetimes.write().unwrap();
            /*let guard = self.section_lifetimes.guard();
            let section_lifetimes = self.section_lifetimes.with_guard(&guard);*/
            section_lifetimes.insert(old_section.get_key(), old_section.clone());
        }
        // ignore send-error; this just means we're within a "proxy subtree", and the root mtx has already been dropped
        // todo: probably have caller decide what to do in this situation, as an argument to `proxy()` (since in some cases this might be unexpected)
        let _ = self.root_mtx_sender.send(MtxMessage::UpdateSectionLifetime(old_section.get_key(), old_section.clone()));
        section_end_time
    }
    fn start_new_section(&mut self, name: &str, extra_info: Option<String>, old_section_end_time: f64) {
        let new_section = MtxSection {
            path: format!("{}/{}", self.path_from_root_mtx, name),
            start_time: old_section_end_time,
            extra_info,
            duration: None,
        };
        trace!("Section started:{new_section:?}");
        self.start_new_section_2(new_section, name != MTX_FINAL_SECTION_NAME);
    }
    fn start_new_section_2(&mut self, new_section: MtxSection, send_to_root_mtx: bool) {
        self.current_section = new_section.clone();
        // store partial-data for new section
        if send_to_root_mtx {
            let msg = MtxMessage::UpdateSectionLifetime(new_section.get_key(), new_section);
            /*if self.is_root_mtx() {
                MtxMessage::apply_messages_to_mtx_data(&self.section_lifetimes, vec![msg].into_iter());
            } else {*/
            // ignore send-error; this just means we're within a "proxy subtree", and the root mtx has already been dropped
            // todo: probably have caller decide what to do in this situation, as an argument to `proxy()` (since in some cases this might be unexpected)
            let _ = self.root_mtx_sender.send(msg);
        }
    }

    /*pub fn send_to_monitor_backend(&mut self) {
        // sort section_lifetimes collection (makes log-based inspection a lot easier)
        self.section_lifetimes.sort_keys();

        //send_mtx_tree_to_monitor_backend(self).await;
        let self_as_str = json_obj_1field("mtx", self).map(|a| a.to_string()).unwrap_or("failed to serialize mtx-instance".to_string());
        tokio::spawn(async move {
            let result = send_mtx_tree_to_monitor_backend(self_as_str).await;
            result.expect("Got error while sending mtx-tree to monitor-backend...");
        });
    }*/

    /// Helper function to make an `info!(...)` log-call, with the basic info like function-name. (avoids need to add custom message for logging of key function-calls)
    pub fn log_call(&self, temp_extra_info: Option<String>) {
        let current_section_extra_info_str = self.current_section.extra_info.as_ref().map_or("".to_owned(), |a| format!(" {}", a));
        let temp_extra_info_str = temp_extra_info.map_or("".to_owned(), |a| format!(" {}", a));
        info!("Called:{}{}{}", self.func_name, current_section_extra_info_str, temp_extra_info_str);
    }
}
impl Drop for Mtx {
    fn drop(&mut self) {
        //println!("Drop called. @current_section:{:?} @lifetimes:{:?}", self.current_section.get_key(), /*self.section_lifetimes*/ "[snip]");
        self.section(MTX_FINAL_SECTION_NAME); // called simply to mark end of prior section
        if self.is_root_mtx() && !cfg!(test) {
            MtxMessage::apply_messages_to_mtx_data(&self.section_lifetimes, self.msg_receiver.drain());

            let (id_clone, section_lifetimes_clone) = (self.id.clone(), self.section_lifetimes.clone());
            tokio::spawn(async move {
                // sending `None` since we don't have an easy way to access the `last_data_as_str` here (it's in the tokio loop within `Mtx::new`)
                package_up_mtx_data_and_send_to_channel(id_clone, section_lifetimes_clone, None).await;
            });
        }
    }
}

pub async fn package_up_mtx_data_and_send_to_channel(id: Arc<Uuid>, section_lifetimes: Arc<RwLock<IndexMap<String, MtxSection>>>, last_data_as_str: Option<String>) -> Option<String> {
    let mtx_data = MtxData::from(id, section_lifetimes).await;

    // we stringify the data an additional time here, as a convenience field for user-project (so it can check if action needs to be taken)
    let data_as_str = serde_json::to_string(&mtx_data).unwrap();
    
    let (msg_sender, _msg_receiver) = MTX_GLOBAL_MESSAGE_SENDER_AND_RECEIVER.get().expect("MTX_GLOBAL_MESSAGE_SENDER_AND_RECEIVER not initialized!");

    // ignore error; if channel is full, we don't care (user-project must just not care to be reading them all)
    let _ = msg_sender.send_timeout(MtxGlobalMsg::NotifyMtxDataPossiblyChanged(MtxDataWithExtraInfo {
        id: mtx_data.id,
        section_lifetimes: mtx_data.section_lifetimes,
        data_as_str: data_as_str.clone(),
        last_data_as_str: last_data_as_str.clone(),
    }), Duration::from_millis(500)); // we pick 500ms so it's certain to complete within the 1s interval of the tokio loop within `Mtx::new`

    Some(data_as_str)
}

pub enum MtxGlobalMsg {
    NotifyMtxDataPossiblyChanged(MtxDataWithExtraInfo),
}
/*pub static MTX_GLOBAL_MESSAGE_SENDER_AND_RECEIVER: Lazy<(FSender<MtxGlobalMsg>, FReceiver<MtxGlobalMsg>)> = Lazy::new(|| {
    // limit to 10k messages (eg. in case user-project is not reading them, we don't want the queue's memory-usage to just endlessly grow)
    let (msg_sender, msg_receiver): (FSender<MtxGlobalMsg>, FReceiver<MtxGlobalMsg>) = flume::bounded(10000);
    (msg_sender, msg_receiver)
});*/
/// It is up to the user-project to initialize this channel at program startup; until that is done, any data-updates from Mtx instances will just be lost/ignored.
pub static MTX_GLOBAL_MESSAGE_SENDER_AND_RECEIVER: OnceCell<(FSender<MtxGlobalMsg>, FReceiver<MtxGlobalMsg>)> = OnceCell::new();

/*//wrap_slow_macros!{

// derived from struct in from_app_server.rs
#[derive(Serialize)]
pub struct SendMtxResults_Request<'a> {
    mtx: &'a Mtx,
}

//}*/

pub fn json_obj_1field<T: Serialize>(field_name: &str, field_value: T) -> Result<JSONValue, Error> {
    let mut obj = serde_json::Map::new();
    //obj[field_name] = field_value;
    obj.insert(field_name.to_string(), serde_json::to_value(field_value)?);
    return Ok(JSONValue::Object(obj));
}
/*pub fn get_host_of_other_pod(service_name: &str, namespace: &str, port: &str) -> String {
    format!("{service_name}.{namespace}.svc.cluster.local:{port}")
}*/

pub const MTX_FINAL_SECTION_NAME: &'static str = "$end-marker$";

impl MtxSection {
    pub fn get_key(&self) -> String {
        // use "#" as the separator, so that it sorts earlier than "/" (such that children show up after the parent, when sorting by path-plus-time)
        let new_section_path_plus_time = format!("{}#{}", self.path, self.start_time);
        new_section_path_plus_time
    }
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
        //section_lifetimes: Arc<flurry::HashMap<String, MtxSection>>,
    ) -> MtxData {
        let section_lifetimes = section_lifetimes.read().unwrap();
        MtxData {
            //id: (*id).clone(),
            id: (*id).to_string(),
            section_lifetimes: (*section_lifetimes).clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MtxDataWithExtraInfo {
    pub id: String,
    pub section_lifetimes: IndexMap<String, MtxSection>,
    //pub section_lifetimes: Arc<flurry::HashMap<String, MtxSection>>,
    
    // extra info (eg. so user-project can know if action needs to be taken)
    pub data_as_str: String,
    pub last_data_as_str: Option<String>,
}

#[derive(SimpleObject)] // added for AGQL variant only
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MtxDataForAGQL {
    pub id: String, // changed to String in MtxData structs, for more universality (eg. easier usage with gql in monitor-backend -- agql's OutputType isn't implemented for Uuid)

    // use HashMap in this variant, since agql has OutputType implemented for it
    // (but tell serde to serialize the HashMap using the ordered_map function, which collects the entries into a temporary BTreeMap -- which is sorted)
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