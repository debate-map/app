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
use std::{sync::Arc, cell::RefCell, time::{Instant, Duration}, borrow::Cow, rc::Rc};

use anyhow::Error;
use flume::{Sender, Receiver};
pub(crate) use fn_name;

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
use hyper::{Client, Method, Request, Body};
use indexmap::IndexMap;
pub(crate) use new_mtx;
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use serde_json::{json, Map};
use tokio::time;
use uuid::Uuid;

use crate::utils::{type_aliases::JSONValue, general::general::{time_since_epoch_ms, body_to_str, flurry_hashmap_into_hashmap, flurry_hashmap_into_json_map}};

pub enum MtxMessage {
    /// tuple.0 is the section's path and time (see section_lifetimes description); tuple.1 is the SectionLifetime struct, with times as ms-since-epoch
    UpdateSectionLifetime(String, MtxSection),
}
impl MtxMessage {
    pub fn apply_messages_to_mtx_data(mtx_section_lifetimes: &Arc<flurry::HashMap<String, MtxSection>>, messages: impl Iterator<Item = MtxMessage>) {
        let guard = mtx_section_lifetimes.guard();
        let section_lifetimes = mtx_section_lifetimes.with_guard(&guard);
        for msg in messages {
            msg.apply_to_mtx_data(&section_lifetimes);
        }
    }
    pub fn apply_to_mtx_data(self, section_lifetimes_ref: &flurry::HashMapRef<String, MtxSection>) {
        match self {
            MtxMessage::UpdateSectionLifetime(path_and_time, lifetime) => {
                section_lifetimes_ref.insert(path_and_time, lifetime);
            }
        }
    }
}

//#[derive(Serialize)]
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
    //pub section_lifetimes: Arc<RwLock<IndexMap<String, SectionLifetime>>>,
    pub section_lifetimes: Arc<flurry::HashMap<String, MtxSection>>,

    // communication helpers
    pub msg_sender: Sender<MtxMessage>,
    pub msg_receiver: Receiver<MtxMessage>,

    //pub parent: Option<&'a mut Mtx<'b, 'b>>,
    //pub parent: Option<&'a RefCell<Self>>,
    //#[serde(skip)] pub parent_sender: Option<Sender<MtxMessage>>,
    pub root_mtx_sender: Sender<MtxMessage>,
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

        let mut new_self = Self {
            id: Arc::new(Uuid::new_v4()),
            func_name: func_name.to_owned(),
            path_from_root_mtx,
            //extra_info,

            // the value of this doesn't matter; it gets overwritten by start_new_section below
            current_section: MtxSection { path: "[temp placeholder]".to_string(), start_time: 0f64, extra_info: None, duration: None },

            section_lifetimes: Arc::new(flurry::HashMap::new()),
            msg_sender,
            msg_receiver,
            //parent: None,
            /*parent_sender: match parent {
                Some(parent) => Some(parent.msg_sender.clone()),
                None => None,
            },*/
            root_mtx_sender,
        };
        new_self.start_new_section(&first_section_name.into(), extra_info, time_since_epoch_ms());

        // start a timer that, once per second (while the mtx-instance is active/in-scope), sends its data to the backend
        let (id_clone, section_lifetimes_clone, msg_receiver_clone) = (new_self.id.clone(), new_self.section_lifetimes.clone(), new_self.msg_receiver.clone());
        tokio::spawn(async move {
            let mut interval = time::interval(time::Duration::from_secs(1));
            let mut last_data_as_str: Option<String> = None;
            loop {
                interval.tick().await;
                // if we're the last place holding references to the id and section-lifetimes, the mtx object must have been destroyed;
                //     that means it has already sent its final results to the monitor-backend, so we can end this loop
                if Arc::strong_count(&id_clone) <= 1 && Arc::strong_count(&section_lifetimes_clone) <= 1 {
                    println!("Stopping mtx-data-sending timer, since mtx instance has been dropped."); // temp
                    break;
                }

                // process any messages that have buffered up
                MtxMessage::apply_messages_to_mtx_data(&section_lifetimes_clone, msg_receiver_clone.drain());

                // if this is the first iteration, wait a bit before trying to serialize+send the section-lifetimes
                // (the flurry::HashMap needs a bit to "apply" the initial section-insert [edit: seems this isn't the reason]; it's ok if this delay is too short sometimes)
                /*if last_data_as_str.is_none() {
                    time::sleep(Duration::from_millis(1000)).await;
                }*/

                // todo: fix that monitor-backend is somehow receiving mtx-entries without "section_lifetimes" empty (the attempted fix above doesn't seem to work)
                // break point

                let send_attempt_fut = send_mtx_data_to_monitor_backend(id_clone.clone(), section_lifetimes_clone.clone(), last_data_as_str.clone());
                let data_as_str = match time::timeout(Duration::from_secs(3), send_attempt_fut).await {
                    Ok(regular_result) => {
                        Some(regular_result.expect("Got error while sending mtx-tree to monitor-backend..."))
                    },
                    Err(_err) => {
                        // if timeout happens, just ignore (there might have been local network glitch or something)
                        //None
                        last_data_as_str
                    }
                };
                
                last_data_as_str = data_as_str;
                //println!("Sent partial results for mtx entry..."); // temp
            }
        });

        new_self
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
            let guard = self.section_lifetimes.guard();
            let section_lifetimes = self.section_lifetimes.with_guard(&guard);
            section_lifetimes.insert(old_section.get_key(), old_section.clone());
        }
        self.root_mtx_sender.send(MtxMessage::UpdateSectionLifetime(old_section.get_key(), old_section.clone())).unwrap();
        section_end_time
    }
    fn start_new_section(&mut self, name: &str, extra_info: Option<String>, old_section_end_time: f64) {
        let new_section = MtxSection {
            path: format!("{}/{}", self.path_from_root_mtx, name),
            start_time: old_section_end_time,
            extra_info,
            duration: None,
        };
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
            self.root_mtx_sender.send(msg).unwrap();
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
}
impl Drop for Mtx {
    fn drop(&mut self) {
        self.section(MTX_FINAL_SECTION_NAME); // called simply to mark end of prior section
        if self.is_root_mtx() {
            MtxMessage::apply_messages_to_mtx_data(&self.section_lifetimes, self.msg_receiver.drain());

            //self.send_to_monitor_backend();
            let (id_clone, section_lifetimes_clone) = (self.id.clone(), self.section_lifetimes.clone());
            tokio::spawn(async move {
                send_mtx_data_to_monitor_backend(id_clone, section_lifetimes_clone, None).await
                    .expect("Got error while sending mtx-tree to monitor-backend...");
            });
        }
    }
}

pub const MTX_FINAL_SECTION_NAME: &'static str = "$end-marker$";

#[derive(Clone, Serialize)]
pub struct MtxSection {
    pub path: String,
    pub extra_info: Option<String>,
    pub start_time: f64,
    pub duration: Option<f64>,
}
impl MtxSection {
    pub fn get_key(&self) -> String {
        // use "#" as the separator, so that it sorts earlier than "/" (such that children show up after the parent, when sorting by path-plus-time)
        let new_section_path_plus_time = format!("{}#{}", self.path, self.start_time);
        new_section_path_plus_time
    }
}

/*//wrap_slow_macros!{

// derived from struct in from_app_server_rs.rs
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

pub async fn send_mtx_data_to_monitor_backend(id: Arc<Uuid>, section_lifetimes: Arc<flurry::HashMap<String, MtxSection>>, last_data_as_str: Option<String>) -> Result<String, Error> {
    let mut data_as_map = Map::new();
    data_as_map.insert("id".to_owned(), serde_json::to_value((*id).clone())?);

    let data_as_str = {
        //data_as_map.insert("section_lifetimes".to_owned(), serde_json::to_value((*section_lifetimes).clone())?);
        let guard = section_lifetimes.guard();
        /*let section_lifetimes_as_hashmap = flurry_hashmap_into_hashmap(&section_lifetimes, guard);
        data_as_map.insert("section_lifetimes".to_owned(), serde_json::to_value(section_lifetimes_as_hashmap)?);*/
        let section_lifetimes_as_json_map = flurry_hashmap_into_json_map(&section_lifetimes, guard, true)?;
        data_as_map.insert("section_lifetimes".to_owned(), JSONValue::Object(section_lifetimes_as_json_map));

        //let self_as_str = json_obj_1field("mtx", self).map(|a| a.to_string()).unwrap_or("failed to serialize mtx-instance".to_string());
        let mut wrapper = Map::new();
        wrapper.insert("mtx".to_owned(), JSONValue::Object(data_as_map));
        JSONValue::Object(wrapper).to_string()
    };
    let proceed = match last_data_as_str {
        Some(last) => data_as_str != last,
        None => true,
    };
    if proceed {
        send_mtx_tree_to_monitor_backend(data_as_str.clone()).await?;
    }
    Ok(data_as_str)
}

pub async fn send_mtx_tree_to_monitor_backend(
    //mtx_root: &Mtx
    mtx_root_as_str: String
) -> Result<(), Error> {
    //println!("Sending mtx-tree to monitor-backend:{}", serde_json::to_string_pretty(mtx_root).unwrap());
    let client = Client::new();

    let req = Request::builder()
        .method(Method::POST)
        //.uri(format!("http://{}/post", get_host_of_other_pod("dm-monitor-backend", "default", "5130")))
        .uri("http://dm-monitor-backend.default.svc.cluster.local:5130/send-mtx-results")
        .header("Content-Type", "application/json")
        //.body(serde_json::to_string(&SendMtxResults_Request { mtx: mtx_root }).unwrap().into())
        .body(
            //json_obj_1field("mtx", mtx_root)?.to_string()
            mtx_root_as_str
            .into()
        )?;
    let _res = client.request(req).await?;
    //println!("Done! Response:{}", body_to_str(res.into_body()).await?);

    Ok::<(), Error>(())
}