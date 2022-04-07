use std::{any::TypeId, pin::Pin, task::{Poll, Waker}, time::{Duration, Instant, SystemTime, UNIX_EPOCH}, cell::RefCell};
use anyhow::{bail, Context, Error};
use async_graphql::{Result, async_stream::{stream, self}, OutputType, Object, Positioned, parser::types::Field};
use deadpool_postgres::Pool;
use flume::{Sender, Receiver};
use futures_util::{Stream, StreamExt, Future, stream, TryFutureExt};
use hyper::Body;
use rust_shared::SubError;
use serde::{Serialize, Deserialize, de::DeserializeOwned};
use serde_json::{json, Map};
use tokio_postgres::{Client, Row, types::ToSql};
use uuid::Uuid;
use metrics::{counter, histogram, increment_counter};

use crate::{store::live_queries::{LQStorageWrapper, LQStorage, DropLQWatcherMsg}, utils::{type_aliases::JSONValue}};
use super::{super::{mtx::mtx::{new_mtx, Mtx}}, filter::{QueryFilter, FilterInput}};

/*pub struct GQLSet<T> { pub nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }*/

//#[async_trait]
pub trait GQLSet<T> {
    fn from(entries: Vec<T>) -> Self;
    //async fn nodes(&self) -> &Vec<T>;
    fn nodes(&self) -> &Vec<T>;
}

pub fn json_values_to_typed_entries<T: From<Row> + Serialize + DeserializeOwned>(json_entries: Vec<JSONValue>) -> Vec<T> {
    json_entries.into_iter().map(|a| serde_json::from_value(a).unwrap()).collect()
}
pub fn json_maps_to_typed_entries<T: From<Row> + Serialize + DeserializeOwned>(json_entries: Vec<Map<String, JSONValue>>) -> Vec<T> {
    json_entries.into_iter().map(|a| serde_json::from_value(serde_json::Value::Object(a)).unwrap()).collect()
}

pub async fn handle_generic_gql_collection_request<'a,
    T: 'a + From<Row> + Serialize + DeserializeOwned + Send + Clone,
    GQLSetVariant: 'a + GQLSet<T> + Send + Clone + Sync,
>(ctx: &'a async_graphql::Context<'a>, table_name: &'a str, filter_json: Option<FilterInput>) -> impl Stream<Item = Result<GQLSetVariant, SubError>> + 'a {
    new_mtx!(mtx, "1", None, Some(format!("@table_name:{table_name} @filter:{filter_json:?}")));
    let stream_for_error = |err: Error| {
        //return stream::once(async { Err(err) });
        let base_stream = async_stream::stream! {
            yield Err(SubError::new(err.to_string()));
        };
        let (s1, _r1): (Sender<DropLQWatcherMsg>, Receiver<DropLQWatcherMsg>) = flume::unbounded();
        Stream_WithDropListener::new(base_stream, table_name, QueryFilter::empty(), Uuid::new_v4(), s1)
    };

    mtx.section("2");
    let filter = match QueryFilter::from_filter_input_opt(&filter_json) { Ok(a) => a, Err(err) => return stream_for_error(err) };
    let (entries_as_type, stream_id, sender_for_dropping_lq_watcher, lq_entry_receiver_clone) = {
        let storage = ctx.data::<LQStorageWrapper>().unwrap();

        /*let mut stream = GQLResultStream::new(storage_wrapper.clone(), collection_name, filter.clone(), GQLSetVariant::from(entries));
        let stream_id = stream.id.clone();*/
        let stream_id = Uuid::new_v4();
        let (entries_as_type, watcher) = storage.start_lq_watcher::<T>(table_name, &filter, stream_id, ctx, Some(&mtx)).await;

        (entries_as_type, stream_id, storage.channel_for_lq_watcher_drops__sender_base.clone(), watcher.new_entries_channel_receiver.clone())
    };

    mtx.section("3");
    //let filter_clone = filter.clone();
    let base_stream = async_stream::stream! {
        yield Ok(GQLSetVariant::from(entries_as_type));
        loop {
            let next_entries = lq_entry_receiver_clone.recv_async().await.unwrap();
            let next_entries_as_type: Vec<T> = json_maps_to_typed_entries(next_entries);
            let next_result_set = GQLSetVariant::from(next_entries_as_type);
            yield Ok(next_result_set);
        }
    };
    Stream_WithDropListener::new(base_stream, table_name, filter, stream_id, sender_for_dropping_lq_watcher)
}
pub async fn handle_generic_gql_doc_request<'a,
    T: 'a + From<Row> + Serialize + DeserializeOwned + Send + Sync + Clone
>(ctx: &'a async_graphql::Context<'a>, table_name: &'a str, id: String) -> impl Stream<Item = Result<Option<T>, SubError>> + 'a {
    new_mtx!(mtx, "1", None, Some(format!("@table_name:{table_name} @id:{id}")));
    let stream_for_error = |err: Error| {
        //return stream::once(async { Err(err) });
        let base_stream = async_stream::stream! {
            yield Err(SubError::new(err.to_string()));
        };
        let (s1, _r1): (Sender<DropLQWatcherMsg>, Receiver<DropLQWatcherMsg>) = flume::unbounded();
        Stream_WithDropListener::new(base_stream, table_name, QueryFilter::empty(), Uuid::new_v4(), s1)
    };

    mtx.section("2");
    //tokio::time::sleep(std::time::Duration::from_millis(123456789)).await; // temp
    let filter_json = json!({"id": {"equalTo": id}});
    let filter = match QueryFilter::from_filter_input(&filter_json) { Ok(a) => a, Err(err) => return stream_for_error(err) };
    let (entry_as_type, stream_id, sender_for_dropping_lq_watcher, lq_entry_receiver_clone) = {
        let storage = ctx.data::<LQStorageWrapper>().unwrap();

        /*let mut stream = GQLResultStream::new(storage_wrapper.clone(), table_name, filter.clone(), GQLSetVariant::from(entries));
        let stream_id = stream.id.clone();*/
        let stream_id = Uuid::new_v4();
        let (mut entries_as_type, watcher) = storage.start_lq_watcher::<T>(table_name, &filter, stream_id, ctx, Some(&mtx)).await;
        let entry_as_type = entries_as_type.pop();

        (entry_as_type, stream_id, storage.channel_for_lq_watcher_drops__sender_base.clone(), watcher.new_entries_channel_receiver.clone())
    };

    mtx.section("3");
    //let filter_clone = filter.clone();
    let base_stream = async_stream::stream! {
        yield Ok(entry_as_type);
        loop {
            let next_entries = lq_entry_receiver_clone.recv_async().await.unwrap();
            let mut next_entries_as_type: Vec<T> = json_maps_to_typed_entries(next_entries);
            let next_result: Option<T> = next_entries_as_type.pop();
            yield Ok(next_result);
        }
    };
    Stream_WithDropListener::new(base_stream, table_name, filter, stream_id, sender_for_dropping_lq_watcher)
}

pub struct Stream_WithDropListener<'a, T> {
    inner_stream: Pin<Box<dyn Stream<Item = T> + 'a + Send>>,
    table_name: String,
    filter: QueryFilter,
    stream_id: Uuid,
    sender_for_lq_watcher_drops: Sender<DropLQWatcherMsg>,
}
impl<'a, T> Stream_WithDropListener<'a, T> {
    pub fn new(inner_stream_new: impl Stream<Item = T> + 'a + Send, table_name: &str, filter: QueryFilter, stream_id: Uuid, sender_for_lq_watcher_drops: Sender<DropLQWatcherMsg>) -> Self {
        Self {
            inner_stream: Box::pin(inner_stream_new),
            table_name: table_name.to_owned(),
            filter,
            stream_id,
            sender_for_lq_watcher_drops,
        }
    }
}
impl<'a, T> Drop for Stream_WithDropListener<'a, T> {
    fn drop(&mut self) {
        println!("Stream_WithDropListener got dropped. @address:{:p} @table:{} @filter:{:?}", self, self.table_name, self.filter);
        
        // the receivers of the channel below may all be dropped, causing the `send()` to return a SendError; ignore this, since it is expected (for the streams returned by `stream_for_error`)
        #[allow(unused_must_use)]
        {
            self.sender_for_lq_watcher_drops.send(DropLQWatcherMsg::Drop_ByCollectionAndFilterAndStreamID(self.table_name.clone(), self.filter.clone(), self.stream_id));
        }
    }
}
impl<'a, T> Stream for Stream_WithDropListener<'a, T> {
    type Item = T;
    fn poll_next(mut self: Pin<&mut Self>, c: &mut std::task::Context<'_>) -> Poll<Option<<Self as Stream>::Item>> {
        self.inner_stream.as_mut().poll_next(c)
    }
}