use std::{any::TypeId, pin::Pin, task::{Poll, Waker}, time::{Duration, Instant, SystemTime, UNIX_EPOCH}, cell::RefCell};
use anyhow::{anyhow, bail, Context, Error};
use async_graphql::{Result, async_stream::{stream, self}, OutputType, Object, Positioned, parser::types::Field};
use deadpool_postgres::Pool;
use flume::Sender;
use futures_util::{Stream, StreamExt, Future, stream, TryFutureExt};
use hyper::Body;
use serde::{Serialize, Deserialize, de::DeserializeOwned};
use serde_json::{json, Map};
use tokio_postgres::{Client, Row, types::ToSql};
use uuid::Uuid;
//use tokio::sync::Mutex;
use metrics::{counter, histogram, increment_counter};

use crate::{store::live_queries::{LQStorageWrapper, LQStorage, get_lq_key, DropLQWatcherMsg, RowData}, utils::{type_aliases::JSONValue}};

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