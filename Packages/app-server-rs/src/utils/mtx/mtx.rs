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
use std::{sync::Arc, cell::RefCell, time::Instant, borrow::Cow};

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
        let parent_mtx: Option<&$crate::utils::mtx::mtx::Mtx> = $parent_mtx;
        let mut $mtx = $crate::utils::mtx::mtx::Mtx::new($crate::utils::mtx::mtx::fn_name!(), $first_section_name, parent_mtx);
    };
}
use indexmap::IndexMap;
pub(crate) use new_mtx;
use serde::{Serialize, Deserialize};

use crate::utils::{type_aliases::JSONValue, general::time_since_epoch_ms};

pub enum MtxMessage {
    /// tuple.0 is the section's path (relative); tuple.1 is the start-time in ms-since-epoch; tuple.2 is the end-time in ms-since-epoch
    AddSectionLifetime(String, f64, f64),
}

#[derive(Serialize)]
pub struct Mtx {
    #[serde(skip)] pub func_name: String,
    #[serde(skip)] pub path_from_root_mtx: String,
    #[serde(skip)] pub current_section_name: Cow<'static, str>,
    #[serde(skip)] pub current_section_start_time: f64,
    /// This field holds the timings of all sections in the root mtx-enabled function, as well as any mtx-enabled functions called underneath it (where the root mtx is passed).
    /// Entry's key is the "path" to the section, eg: root_func/part1/other_func/part3
    /// Entry's value is a tuple, containing the start-time and duration of the section, stored as fractional milliseconds.
    pub section_lifetimes: IndexMap<String, (f64, f64)>,

    // communication helpers
    #[serde(skip)] pub msg_sender: Sender<MtxMessage>,
    #[serde(skip)] pub msg_receiver: Receiver<MtxMessage>,

    //pub parent: Option<&'a mut Mtx<'b, 'b>>,
    //pub parent: Option<&'a RefCell<Self>>,
    //#[serde(skip)] pub parent_sender: Option<Sender<MtxMessage>>,
    #[serde(skip)] pub root_mtx_sender: Sender<MtxMessage>,
}
//pub static mtx_none: Arc<Mtx> = Arc::new(Mtx::new("n/a"));
impl Mtx {
    pub fn new(func_name: &str, first_section_name: impl Into<Cow<'static, str>>, parent: Option<&Mtx>) -> Self {
        let (msg_sender, msg_receiver): (Sender<MtxMessage>, Receiver<MtxMessage>) = flume::unbounded();
        let root_mtx_sender = match parent {
            Some(parent) => parent.root_mtx_sender.clone(),
            None => msg_sender.clone(),
        };
        Self {
            func_name: func_name.to_owned(),
            path_from_root_mtx: match parent {
                Some(parent) => format!("{}/{}", parent.current_section_path(), func_name),
                None => func_name.to_owned(),
            },
            current_section_name: first_section_name.into(),
            current_section_start_time: time_since_epoch_ms(),
            section_lifetimes: IndexMap::new(),
            msg_sender,
            msg_receiver,
            //parent: None,
            /*parent_sender: match parent {
                Some(parent) => Some(parent.msg_sender.clone()),
                None => None,
            },*/
            root_mtx_sender,
        }
    }
    pub fn is_root_mtx(&self) -> bool {
        !self.path_from_root_mtx.contains("/")
    }
    pub fn current_section_path(&self) -> String {
        format!("{}/{}", self.path_from_root_mtx, self.current_section_name.to_string())
    }
    pub fn section(&mut self, name: impl Into<Cow<'static, str>>) {
        let now = time_since_epoch_ms();
        let duration = now - self.current_section_start_time;
        let section_path = self.current_section_path();
        self.section_lifetimes.insert(section_path.clone(), (self.current_section_start_time, duration));
        self.root_mtx_sender.send(MtxMessage::AddSectionLifetime(section_path, self.current_section_start_time, duration)).unwrap();

        self.current_section_name = name.into();
        self.current_section_start_time = now;
    }
}
impl Drop for Mtx {
    fn drop(&mut self) {
        self.section("end-marker"); // called simply to mark end of prior section
        if self.is_root_mtx() {
            for msg in self.msg_receiver.drain() {
                match msg {
                    MtxMessage::AddSectionLifetime(path, start, duration) => {
                        self.section_lifetimes.insert(path, (start, duration));
                    }
                }
            }
            // sort section_lifetimes collection (makes log-based inspection a lot easier)
            self.section_lifetimes.sort_keys();

            send_mtx_tree_to_monitor_backend(self);
        }
    }
}

pub fn send_mtx_tree_to_monitor_backend(mtx_root: &Mtx) {
    println!("Sending mtx-tree to monitor-backend:{}", serde_json::to_string_pretty(mtx_root).unwrap());
    
    // todo
}