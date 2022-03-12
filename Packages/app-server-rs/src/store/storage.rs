use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::convert::Infallible;
use std::future::Future;
use std::pin::Pin;
use std::rc::Rc;
use std::str::FromStr;
use std::sync::Arc;
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::{Schema, MergedObject, MergedSubscription, ObjectType, Data, Result, SubscriptionType};
use axum::http::Method;
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router};
use flume::{Sender, Receiver, unbounded};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map};
use tokio::sync::{broadcast, mpsc, Mutex};
use tokio_postgres::{Client, Row};
use tower::Service;
use tower_http::cors::{CorsLayer, Origin};
use async_graphql::futures_util::task::{Context, Poll};
use async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use axum::body::{boxed, BoxBody, HttpBody};
use axum::extract::ws::{CloseFrame, Message};
use axum::extract::{FromRequest, RequestParts, WebSocketUpgrade};
use axum::http::{self, Request, Response, StatusCode};
use axum::Error;
use futures_util::future::{BoxFuture, Ready};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{future, Sink, SinkExt, Stream, StreamExt, FutureExt};
use uuid::Uuid;

use crate::utils::filter::{entry_matches_filter, Filter};
use crate::utils::general::{get_entries_in_collection, json_maps_to_typed_entries};
use crate::utils::postgres_parsing::parse_postgres_array;
use crate::utils::type_aliases::JSONValue;

// todo: merge AppState and Storage

pub struct AppState {
    pub user_set: std::sync::Mutex<HashSet<String>>,
    pub tx: broadcast::Sender<String>,
}

pub type StorageWrapper = Arc<Mutex<LQStorage>>;

pub enum DropLQWatcherMsg {
    Drop_ByCollectionAndFilterAndStreamID(String, Filter, Uuid),
}

//#[derive(Default)]
pub struct LQStorage {
    #[allow(clippy::box_collection)]
    pub live_queries: Pin<Box<HashMap<String, LQEntry>>>,
    source_sender_for_lq_watcher_drops: Sender<DropLQWatcherMsg>,
}
impl LQStorage {
    pub fn new() -> (Self, Receiver<DropLQWatcherMsg>) {
        let (s1, r1): (Sender<DropLQWatcherMsg>, Receiver<DropLQWatcherMsg>) = flume::unbounded();
        let new_self = Self {
            live_queries: Box::pin(HashMap::new()),
            source_sender_for_lq_watcher_drops: s1,
        };
        (new_self, r1)
    }

    pub async fn start_lq_watcher<T: From<Row> + Serialize + DeserializeOwned>(&mut self, table_name: &str, filter: &Filter, stream_id: Uuid, ctx: &async_graphql::Context<'_>) -> (Vec<T>, &LQEntryWatcher) {
        let (entry, lq_entries_count, _lq_entry_is_new) = {
            let lq_key = get_lq_key(table_name, filter);
            let mut lq_entries_count = self.live_queries.len();

            let create_new_entry = !self.live_queries.contains_key(&lq_key);
            if create_new_entry {
                let (result_entries, _result_entries_as_type) = get_entries_in_collection::<T>(ctx, table_name, filter).await.expect("Errored while getting entries in collection.");
                let new_entry = LQEntry::new(table_name.to_owned(), filter.clone(), result_entries);
                self.live_queries.insert(lq_key.clone(), new_entry);
            }

            let entry = self.live_queries.get_mut(&lq_key).unwrap();
            if create_new_entry { lq_entries_count += 1; }
            (entry, lq_entries_count, create_new_entry)
        };

        let result_entries = entry.last_entries.clone();
        let result_entries_as_type: Vec<T> = json_maps_to_typed_entries(result_entries);

        //let watcher = entry.get_or_create_watcher(stream_id);
        let old_watcher_count = entry.entry_watchers.len();
        let (watcher, watcher_is_new) = entry.get_or_create_watcher(stream_id);
        let new_watcher_count = old_watcher_count + if watcher_is_new { 1 } else { 0 };
        let watcher_info_str = format!("@watcher_count_for_this_lq_entry:{} @collection:{} @filter:{:?} @lq_entry_count:{}", new_watcher_count, table_name, filter, lq_entries_count);
        println!("LQ-watcher started. {}", watcher_info_str);
        // atm, we do not expect more than 20 users online at the same time; so if there are more than 20 watchers of a single query, log a warning
        if new_watcher_count > 4 {
            println!("WARNING: LQ-watcher count unusually high ({})! {}", new_watcher_count, watcher_info_str);
        }
        
        (result_entries_as_type, watcher)
    }

    pub fn get_sender_for_lq_watcher_drops(&self) -> Sender<DropLQWatcherMsg> {
        self.source_sender_for_lq_watcher_drops.clone()
    }
    pub fn drop_lq_watcher(&mut self, table_name: &str, filter: &Filter, stream_id: Uuid) {
        println!("Got lq-watcher drop request. @table:{} @filter:{} @stream_id:{}", table_name, match filter { Some(filter) => filter.to_string(), None => "n/a".to_owned() }, stream_id);

        let lq_key = get_lq_key(table_name, filter);
        let live_query = self.live_queries.get_mut(&lq_key).unwrap();
        let _removed_value = live_query.entry_watchers.remove(&stream_id).expect(&format!("Trying to drop LQWatcher, but failed, since no entry was found with this key:{}", lq_key));
        
        let new_watcher_count = live_query.entry_watchers.len();
        if new_watcher_count == 0 {
            self.live_queries.remove(&lq_key);
            println!("Watcher count for live-query entry dropped to 0, so removing.");
        }

        println!("LQ-watcher drop complete. @watcher_count_for_this_lq_entry:{} @lq_entry_count:{}", new_watcher_count, self.live_queries.len());
    }
}
pub fn get_lq_key(table_name: &str, filter: &Filter) -> String {
    //format!("@table:{} @filter:{:?}", table_name, filter)
    json!({
        "table": table_name,
        "filter": filter,
    }).to_string()
}

/*fn arcs_eq<T: ?Sized>(left: &Arc<T>, right: &Arc<T>) -> bool {
    let left : *const T = left.as_ref();
    let right : *const T = right.as_ref();
    left == right
}*/

pub struct LQEntryWatcher {
    pub new_entries_channel_sender: Sender<Vec<RowData>>,
    pub new_entries_channel_receiver: Receiver<Vec<RowData>>,
}
impl LQEntryWatcher {
    pub fn new() -> Self {
        let (tx, rx): (Sender<Vec<RowData>>, Receiver<Vec<RowData>>) = flume::unbounded();
        Self {
            new_entries_channel_sender: tx,
            new_entries_channel_receiver: rx,
        }
    }
}

pub type RowData = Map<String, JSONValue>;

//#[derive(Default)]
/// Holds the data related to a specific query (ie. collection-name + filter).
pub struct LQEntry {
    pub table_name: String,
    pub filter: Filter,
    //watcher_count: i32,
    pub last_entries: Vec<RowData>,
    //pub change_listeners: HashMap<Uuid, LQChangeListener<'a>>,
    entry_watchers: HashMap<Uuid, LQEntryWatcher>,
    /*pub new_entries_channel_sender: Sender<Vec<JSONValue>>,
    pub new_entries_channel_receiver: Receiver<Vec<JSONValue>>,*/
}
impl LQEntry {
    pub fn new(table_name: String, filter: Filter, initial_entries: Vec<RowData>) -> Self {
        //let (s1, r1) = unbounded();
        Self {
            table_name,
            filter,
            //watcher_count: 0,
            last_entries: initial_entries,
            entry_watchers: HashMap::new(),
            /*new_entries_channel_sender: s1,
            new_entries_channel_receiver: r1,*/
        }
    }

    pub fn get_or_create_watcher(&mut self, stream_id: Uuid) -> (&LQEntryWatcher, bool) {
        let create_new = !self.entry_watchers.contains_key(&stream_id);
        let watcher = self.entry_watchers.entry(stream_id).or_insert_with(LQEntryWatcher::new);
        (watcher, create_new)
    }
    /*pub fn get_or_create_watcher(&mut self, stream_id: Uuid) -> (&LQEntryWatcher, usize) {
        let watcher = self.entry_watchers.entry(stream_id).or_insert(LQEntryWatcher::new());
        (&watcher, self.entry_watchers.len())
        /*if self.entry_watchers.contains_key(&stream_id) {
            return (self.entry_watchers.get(&stream_id).unwrap(), self.entry_watchers.len());
        }
        let watcher = LQEntryWatcher::new();
        self.entry_watchers.insert(stream_id, watcher);
        (&watcher, self.entry_watchers.len())*/
    }*/

    pub fn on_table_changed(&mut self, change: &LDChange) {
        let old_entries = &self.last_entries;
        let mut new_entries = old_entries.clone();
        let mut our_data_changed = false;
        match change.kind.as_str() {
            "insert" => {
                let new_entry = change.new_data_as_map().unwrap();
                let filter_check_result = entry_matches_filter(&new_entry, &self.filter)
                    .expect(&format!("Failed to execute filter match-check on new database entry. @table:{} @filter:{:?}", self.table_name, self.filter));
                if filter_check_result {
                    new_entries.push(new_entry);
                    our_data_changed = true;
                }
            },
            "update" => {
                let new_data = change.new_data_as_map().unwrap();
                let entry_index = new_entries.iter_mut().position(|a| a["id"].as_str() == new_data["id"].as_str());
                match entry_index {
                    Some(entry_index) => {
                        let entry = new_entries.get_mut(entry_index).unwrap();
                        for key in new_data.keys() {
                            entry.insert(key.to_owned(), new_data[key].clone());
                            our_data_changed = true;
                        }
                        let filter_check_result = entry_matches_filter(entry, &self.filter)
                            .expect(&format!("Failed to execute filter match-check on updated database entry. @table:{} @filter:{:?}", self.table_name, self.filter));
                        if !filter_check_result {
                            new_entries.remove(entry_index);
                            our_data_changed = true;
                        }
                    },
                    None => {},
                };
            },
            "delete" => {
                let id = change.get_row_id();
                let entry_index = new_entries.iter().position(|a| a["id"].as_str().unwrap() == id);
                match entry_index {
                    Some(entry_index) => {
                        new_entries.remove(entry_index);
                        our_data_changed = true;
                    },
                    None => {},
                };
            },
            _ => {
                // ignore any other types of change (no need to even tell the watchers about it)
                return;
            },
        };
        if !our_data_changed { return; }

        new_entries.sort_by_key(|a| a["id"].as_str().unwrap().to_owned()); // sort entries by id, so there is a consistent ordering
        
        for (_watcher_stream_id, watcher) in &self.entry_watchers {
            watcher.new_entries_channel_sender.send(new_entries.clone());
        }
        //self.new_entries_channel_sender.send(new_entries.clone());
        self.last_entries = new_entries;
    }

    /*pub async fn await_next_entries(&mut self, stream_id: Uuid) -> Vec<JSONValue> {
        let watcher = self.get_or_create_watcher(stream_id);
        let new_result = watcher.new_entries_channel_receiver.recv_async().await.unwrap();
        new_result
    }*/
}

#[derive(Deserialize)]
pub struct LDChange {
    pub kind: String,
    pub schema: String,
    pub table: String,
    pub columnnames: Option<Vec<String>>,
    pub columntypes: Option<Vec<String>>,
    pub columnvalues: Option<Vec<JSONValue>>,
    pub oldkeys: Option<OldKeys>,
}
impl LDChange {
    pub fn new_data_as_map(&self) -> Option<RowData> {
        //let new_entry = JSONValue::Object();
        //let new_entry = json!({});
        let mut new_entry: RowData = Map::new();
        for (i, key) in self.columnnames.as_ref()?.iter().enumerate() {
            let typ = self.columntypes.as_ref()?.get(i).unwrap();
            let value = self.columnvalues.as_ref()?.get(i).unwrap();
            new_entry.insert(key.to_owned(), clone_ldchange_val_0with_type_fixes(value, typ));
        }
        //*new_entry.as_object().unwrap()
        Some(new_entry)
    }
    pub fn get_row_id(&self) -> String {
        let id_from_oldkeys = self.oldkeys.clone()
            .and_then(|a| a.data_as_map().get("id").cloned())
            .and_then(|a| a.as_str().map(|b| b.to_owned()));
        match id_from_oldkeys {
            Some(id) => id,
            None => {
                let new_data_as_map = self.new_data_as_map();
                new_data_as_map.unwrap().get("id").unwrap().as_str().map(|a| a.to_owned()).unwrap()
            },
        }
    }
}
fn clone_ldchange_val_0with_type_fixes(value: &JSONValue, typ: &str) -> JSONValue {
    if typ.ends_with("[]") {
        let item_type_as_bytes = &typ.as_bytes()[..typ.find("[]").unwrap()];
        let item_type = String::from_utf8(item_type_as_bytes.to_vec()).unwrap();
        return parse_postgres_array(value.as_str().unwrap(), item_type == "jsonb");
    }
    match typ {
        "jsonb" => {
            // the LDChange vals of type jsonb are initially stored as strings
            // convert that to a serde_json::Value::Object, so serde_json::from_value(...) can auto-deserialize it to a nested struct
            match value.as_str() {
                Some(val_as_str) => {
                    serde_json::from_str(val_as_str).unwrap()
                },
                None => serde_json::Value::Null,
            }
        },
        _ => value.clone(),
    }
}
#[derive(Clone, Deserialize)]
pub struct OldKeys {
    pub keynames: Vec<String>,
    pub keytypes: Vec<String>,
    pub keyvalues: Vec<JSONValue>,
}
impl OldKeys {
    pub fn data_as_map(&self) -> RowData {
        let mut new_entry: RowData = Map::new();
        for (i, key) in self.keynames.iter().enumerate() {
            let typ = self.keytypes.get(i).unwrap();
            let value = self.keyvalues.get(i).unwrap();
            new_entry.insert(key.to_owned(), clone_ldchange_val_0with_type_fixes(value, typ));
        }
        new_entry
    }
}

/*
[postgres logical-decoding message examples]

row addition
==========
{"change":[
    {
        "kind":"insert",
        "schema":"app_public",
        "table":"globalData",
        "columnnames":["extras","id"],
        "columntypes":["jsonb","text"],
        "columnvalues":[
            "{\"dbReadOnly\": false, \"dbReadOnly_message\": \"test1\"}",
            "main2"
        ]
    }
]}

row change
==========
{"change": [
    {
        "kind":"update",
        "schema":"app_public",
        "table":"globalData",
        "columnnames":["extras","id"],
        "columntypes":["jsonb","text"],
        "columnvalues":[
            "{\"dbReadOnly\": false, \"dbReadOnly_message\": \"test123\"}",
            "main"
        ],
        "oldkeys":{
            "keynames":["id"],
            "keytypes":["text"],
            "keyvalues":["main"]
        }
    }
]}

row deletion (regular mode)
==========
{"change":[
    {
        "kind":"delete",
        "schema":"app_public",
        "table":"globalData",
        "oldkeys":{
            "keynames":["id"],
            "keytypes":["text"],
            "keyvalues":["main2"]
        }
    }
]}
*/