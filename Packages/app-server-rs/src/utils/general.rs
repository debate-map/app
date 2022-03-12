use std::{error::Error, any::TypeId, pin::Pin, task::{Poll, Waker}, time::Duration};
use anyhow::{bail, Context};
use async_graphql::{Result, async_stream::{stream, self}, OutputType, Object, Positioned, parser::types::Field};
use flume::Sender;
use futures_util::{Stream, StreamExt, Future, stream, TryFutureExt};
use serde::{Serialize, Deserialize, de::DeserializeOwned};
use serde_json::{json, Map};
use tokio_postgres::{Client, Row};
use uuid::Uuid;
//use tokio::sync::Mutex;

use crate::{store::storage::{StorageWrapper, LQStorage, get_lq_key, DropLQWatcherMsg, RowData}, utils::{type_aliases::JSONValue, filter::get_sql_for_filters}};

use super::filter::Filter;

// temp (these will not be useful once the streams are live/auto-update)
/*pub async fn get_first_item_from_stream_in_result_in_future<T, U: std::fmt::Debug>(result: impl Future<Output = Result<impl Stream<Item = T>, U>>) -> T {
    let stream = result.await.unwrap();
    get_first_item_from_stream(stream).await
}
pub async fn get_first_item_from_stream<T>(stream: impl Stream<Item = T>) -> T {
    let first_item = stream.collect::<Vec<T>>().await.pop().unwrap();
    first_item
}*/

/*pub struct GQLSet<T> { pub nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }*/

//#[async_trait]
pub trait GQLSet<T> {
    fn from(entries: Vec<T>) -> Self;
    //async fn nodes(&self) -> &Vec<T>;
    fn nodes(&self) -> &Vec<T>;
}

pub async fn get_entries_in_collection<T: From<Row> + Serialize>(ctx: &async_graphql::Context<'_>, table_name: &str, filter: &Filter) -> Result<(Vec<RowData>, Vec<T>), anyhow::Error> {
    let client = ctx.data::<Client>().unwrap();

    let filters_sql = get_sql_for_filters(filter).with_context(|| format!("Got error while getting sql for filter:{filter:?}"))?;
    let where_clause = match filters_sql.len() {
        0..=2 => "".to_owned(),
        _ => " WHERE ".to_owned() + &filters_sql,
    };
    println!("Running where clause:{where_clause} @filter:{filter:?}");
    let mut rows = client.query(&format!("SELECT * FROM \"{table_name}\"{where_clause};"), &[]).await
        .with_context(|| format!("Error running select command for entries in table. @table:{table_name} @filters_sql:{filters_sql}"))?;

    // sort by id, so that order of our results here is consistent with order after live-query-updating modifications (see storage.rs)
    rows.sort_by_key(|a| a.get::<&str, String>("id"));

    //let entries: Vec<JSONValue> = rows.into_iter().map(|r| r.into()).collect();
    let entries_as_type: Vec<T> = rows.into_iter().map(|r| r.into()).collect();
    //let entries: Vec<JSONValue> = entries_as_type.iter().map(|r| serde_json::to_value(r).unwrap()).collect();
    let entries: Vec<RowData> = entries_as_type.iter().map(|r| {
        let json_val = serde_json::to_value(r).unwrap();
        json_val.as_object().unwrap().clone()
    }).collect();
    Ok((entries, entries_as_type))
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
>(ctx: &'a async_graphql::Context<'a>, table_name: &'a str, filter: Filter) -> impl Stream<Item = GQLSetVariant> + 'a {
    let (entries_as_type, stream_id, sender_for_dropping_lq_watcher, lq_entry_receiver_clone) = {
        let storage_wrapper = ctx.data::<StorageWrapper>().unwrap();
        let mut storage = storage_wrapper.lock().await;
        let sender = storage.get_sender_for_lq_watcher_drops();

        /*let mut stream = GQLResultStream::new(storage_wrapper.clone(), collection_name, filter.clone(), GQLSetVariant::from(entries));
        let stream_id = stream.id.clone();*/
        let stream_id = Uuid::new_v4();
        let (entries_as_type, watcher) = storage.start_lq_watcher::<T>(table_name, &filter, stream_id, ctx).await;

        (entries_as_type, stream_id, sender, watcher.new_entries_channel_receiver.clone())
    };

    //let filter_clone = filter.clone();
    let base_stream = async_stream::stream! {
        yield GQLSetVariant::from(entries_as_type);
        loop {
            let next_entries = lq_entry_receiver_clone.recv_async().await.unwrap();
            let next_entries_as_type: Vec<T> = json_maps_to_typed_entries(next_entries);
            let next_result_set = GQLSetVariant::from(next_entries_as_type);
            yield next_result_set;
        }
    };
    Stream_WithDropListener::new(base_stream, table_name, filter, stream_id, sender_for_dropping_lq_watcher)
}
pub async fn handle_generic_gql_doc_request<'a,
    T: 'a + From<Row> + Serialize + DeserializeOwned + Send + Sync + Clone
>(ctx: &'a async_graphql::Context<'a>, table_name: &'a str, id: String) -> impl Stream<Item = Option<T>> + 'a {
    //tokio::time::sleep(std::time::Duration::from_millis(123456789)).await; // temp
    let filter = Some(json!({"id": {"equalTo": id}}));

    let (entry_as_type, stream_id, sender_for_dropping_lq_watcher, lq_entry_receiver_clone) = {
        let storage_wrapper = ctx.data::<StorageWrapper>().unwrap();
        let mut storage = storage_wrapper.lock().await;
        let sender = storage.get_sender_for_lq_watcher_drops();

        /*let mut stream = GQLResultStream::new(storage_wrapper.clone(), table_name, filter.clone(), GQLSetVariant::from(entries));
        let stream_id = stream.id.clone();*/
        let stream_id = Uuid::new_v4();
        let (mut entries_as_type, watcher) = storage.start_lq_watcher::<T>(table_name, &filter, stream_id, ctx).await;
        let entry_as_type = entries_as_type.pop();

        (entry_as_type, stream_id, sender, watcher.new_entries_channel_receiver.clone())
    };

    //let filter_clone = filter.clone();
    let base_stream = async_stream::stream! {
        yield entry_as_type;
        loop {
            let next_entries = lq_entry_receiver_clone.recv_async().await.unwrap();
            let mut next_entries_as_type: Vec<T> = json_maps_to_typed_entries(next_entries);
            let next_result: Option<T> = next_entries_as_type.pop();
            yield next_result;
        }
    };
    Stream_WithDropListener::new(base_stream, table_name, filter, stream_id, sender_for_dropping_lq_watcher)
}

pub struct Stream_WithDropListener<'a, T> {
    inner_stream: Pin<Box<dyn Stream<Item = T> + 'a + Send>>,
    table_name: String,
    filter: Filter,
    stream_id: Uuid,
    sender_for_lq_watcher_drops: Sender<DropLQWatcherMsg>,
}
impl<'a, T> Stream_WithDropListener<'a, T> {
    pub fn new(inner_stream_new: impl Stream<Item = T> + 'a + Send, table_name: &str, filter: Filter, stream_id: Uuid, sender_for_lq_watcher_drops: Sender<DropLQWatcherMsg>) -> Self {
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
        self.sender_for_lq_watcher_drops.send(DropLQWatcherMsg::Drop_ByCollectionAndFilterAndStreamID(self.table_name.clone(), self.filter.clone(), self.stream_id));
    }
}
impl<'a, T> Stream for Stream_WithDropListener<'a, T> {
    type Item = T;
    fn poll_next(mut self: Pin<&mut Self>, c: &mut std::task::Context<'_>) -> Poll<Option<<Self as Stream>::Item>> {
        self.inner_stream.as_mut().poll_next(c)
    }
}