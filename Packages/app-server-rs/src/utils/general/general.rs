use std::{any::TypeId, pin::Pin, task::{Poll, Waker}, time::{Duration, Instant, SystemTime, UNIX_EPOCH}, cell::RefCell, collections::HashMap, iter::{once, empty}};
use anyhow::{anyhow, bail, Context, Error};
use async_graphql::{Result, async_stream::{stream, self}, OutputType, Object, Positioned, parser::types::Field};
use deadpool_postgres::Pool;
use flume::Sender;
use futures_util::{Stream, StreamExt, Future, stream, TryFutureExt};
use hyper::Body;
use serde::{Serialize, Deserialize, de::DeserializeOwned};
use serde_json::{json, Map};
use tokio::sync::RwLock;
use tokio_postgres::{Client, Row, types::ToSql};
use uuid::Uuid;
//use tokio::sync::Mutex;
use metrics::{counter, histogram, increment_counter};
use std::hash::Hash;

use crate::{store::live_queries::{LQStorageWrapper, LQStorage, DropLQWatcherMsg}, utils::{type_aliases::JSONValue}};

pub fn time_since_epoch() -> Duration {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap()
}
pub fn time_since_epoch_ms() -> f64 {
    time_since_epoch().as_secs_f64() * 1000f64
}

pub async fn body_to_str(body: Body) -> Result<String, Error> {
    let bytes1 = hyper::body::to_bytes(body).await?;
    let req_as_str: String = String::from_utf8_lossy(&bytes1).as_ref().to_owned();
    Ok(req_as_str)
}

pub fn to_anyhow<T: std::error::Error>(err: T) -> Error
    where T: Into<Error> + Send + Sync
{
    anyhow!(err)
}

/// Alternative to `my_hash_map.entry(key).or_insert_with(...)`, for when the hashmap is wrapped in a RwLock, and you want a "write" lock to only be obtained if a "read" lock is insufficient.
/// Returns `true` if the entry didn't exist and had to be created -- `false` otherwise.
/// See: https://stackoverflow.com/a/57057033
pub async fn rw_locked_hashmap__get_entry_or_insert_with<K, V: Clone>(map: &RwLock<HashMap<K, V>>, key: K, insert_func: impl FnOnce() -> V) -> (V, bool)
    where K: Sized, K: Hash + Eq
{
    let map_read = map.read().await;
    if let Some(val) = map_read.get(&key) {
        let val_clone = val.clone();
        return (val_clone, false);
    }
    
    let mut map_write = map.write().await;
    // use entry().or_insert_with() in case another thread inserted the same key while we were unlocked above
    let val_clone = map_write.entry(key).or_insert_with(insert_func).clone();
    (val_clone, true)
}

/*pub fn generic_iter<I>(iter: I) -> I
    where I: IntoIterator
{
    return iter;
}*/

pub fn match_cond_to_iter<T>(cond_x: bool, iter_y: impl Iterator<Item = T> + 'static, iter_z: impl Iterator<Item = T> + 'static)
    //-> ()
    //-> &'a mut dyn Iterator
    -> Box<dyn Iterator<Item = T>>
{
    /*if y {
        return Box::new(x);
    }
    Box::new(z);*/

    //return if y { &x } else { &z };

    /*let x;
    let y;
    let z: &mut dyn Iterator = if y {
        x = iter_x;
        &mut x
    } else {
        y = iter_z;
        &mut y
    };

    z*/
    
    //let iter: Iterator = if true { Some(SF::let(",")) } else { None };

    //let iter: Box<dyn Iterator<Item = T>> = if true { Box::new(iter_x) } else { Box::new(iter_z) };
    match cond_x {
        true => Box::new(iter_y),
        false => Box::new(iter_z)
    }
}