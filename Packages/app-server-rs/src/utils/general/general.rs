use std::{any::TypeId, pin::Pin, task::{Poll, Waker}, time::{Duration, Instant, SystemTime, UNIX_EPOCH}, cell::RefCell, collections::HashMap, iter::{once, empty}, fmt::Display, sync::atomic::{Ordering, AtomicU64}};
use rust_shared::{anyhow::{anyhow, bail, Context, Error}, serde_json, utils::type_aliases::JSONValue};
use rust_shared::async_graphql::{Result, async_stream::{stream, self}, OutputType, Object, Positioned, parser::types::Field};
use deadpool_postgres::Pool;
use flume::Sender;
use flurry::Guard;
use futures_util::{Stream, StreamExt, Future, stream, TryFutureExt};
use rust_shared::hyper::Body;
use itertools::Itertools;
use rust_shared::serde::{Serialize, Deserialize, de::DeserializeOwned};
use rust_shared::serde_json::{json, Map};
use rust_shared::tokio::sync::RwLock;
use rust_shared::tokio_postgres::{Client, Row, types::ToSql};
use rust_shared::uuid::Uuid;
//use rust_shared::tokio::sync::Mutex;
use metrics::{counter, histogram, increment_counter};
use std::hash::Hash;

use crate::{store::live_queries::{LQStorageWrapper, LQStorage, DropLQWatcherMsg}, utils::{mtx::mtx::{new_mtx, Mtx}}};

pub async fn body_to_str(body: Body) -> Result<String, Error> {
    let bytes1 = rust_shared::hyper::body::to_bytes(body).await?;
    let req_as_str: String = String::from_utf8_lossy(&bytes1).as_ref().to_owned();
    Ok(req_as_str)
}

/// Alternative to `my_hash_map.entry(key).or_insert_with(...)`, for when the hashmap is wrapped in a RwLock, and you want a "write" lock to only be obtained if a "read" lock is insufficient. (see: https://stackoverflow.com/a/57057033)
/// Returns tuple of:
/// * 0: The value that was found/created.
/// * 1: `true` if the entry didn't exist and had to be created -- `false` otherwise.
/// * 2: The new number of entries in the map.
pub async fn rw_locked_hashmap__get_entry_or_insert_with<K: std::fmt::Debug, V: Clone>(map: &RwLock<HashMap<K, V>>, key: K, insert_func: impl FnOnce() -> V, mtx_p: Option<&Mtx>) -> (V, bool, usize)
    where K: Sized, K: Hash + Eq
{
    new_mtx!(mtx, "1", mtx_p);
    {
        let map_read = map.read().await;
        mtx.section("1.1");
        //println!("1.1, key:{:?}", key);
        if let Some(val) = map_read.get(&key) {
            let val_clone = val.clone();
            let count = map_read.len();
            return (val_clone, false, count);
        }
    }
    
    mtx.section("2");
    let mut map_write = map.write().await;
    mtx.section("2.1");
    //println!("2.1, key:{:?}", key);
    // use entry().or_insert_with() in case another thread inserted the same key while we were unlocked above
    let val_clone = map_write.entry(key).or_insert_with(insert_func).clone();
    let count = map_write.len();
    (val_clone, true, count)
}

pub fn flurry_hashmap_into_hashmap<K: Hash + Eq + Clone, V: Clone>(map: &flurry::HashMap<K, V>, guard: Guard<'_>) -> HashMap<K, V> {
    let mut result = HashMap::new();
    for (key, value) in map.iter(&guard) {
        result.insert(key.clone(), value.clone());
    }
    result
}
pub fn flurry_hashmap_into_json_map<K: Hash + Ord + Eq + Clone + Display, V: Serialize>(map: &flurry::HashMap<K, V>, guard: Guard<'_>, sort: bool) -> Result<Map<String, JSONValue>, serde_json::Error> {
    let mut result = Map::new();
    if sort {
        for (key, value) in map.iter(&guard).sorted_by_key(|a| a.0) {
            result.insert(key.to_string(), serde_json::to_value(value)?);
        }
    } else {
        for (key, value) in map.iter(&guard) {
            result.insert(key.to_string(), serde_json::to_value(value)?);
        }
    }
    Ok(result)
}

pub fn match_cond_to_iter<T>(cond_x: bool, iter_y: impl Iterator<Item = T> + 'static, iter_z: impl Iterator<Item = T> + 'static) -> Box<dyn Iterator<Item = T>> {
    match cond_x {
        true => Box::new(iter_y),
        false => Box::new(iter_z)
    }
}

pub struct AtomicF64 {
    storage: AtomicU64,
}
impl AtomicF64 {
    pub fn new(value: f64) -> Self {
        let as_u64 = value.to_bits();
        Self { storage: AtomicU64::new(as_u64) }
    }
    pub fn store(&self, value: f64, ordering: Ordering) {
        let as_u64 = value.to_bits();
        self.storage.store(as_u64, ordering)
    }
    pub fn load(&self, ordering: Ordering) -> f64 {
        let as_u64 = self.storage.load(ordering);
        f64::from_bits(as_u64)
    }
}