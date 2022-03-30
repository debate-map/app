use std::{any::TypeId, pin::Pin, task::{Poll, Waker}, time::{Duration, Instant, SystemTime, UNIX_EPOCH}, cell::RefCell};
use anyhow::{bail, Context, Error};
use async_graphql::{Result, async_stream::{stream, self}, OutputType, Object, Positioned, parser::types::Field};
use deadpool_postgres::Pool;
use flume::Sender;
use futures_util::{Stream, StreamExt, Future, stream, TryFutureExt};
use serde::{Serialize, Deserialize, de::DeserializeOwned};
use serde_json::{json, Map};
use tokio_postgres::{Client, Row, types::ToSql};
use uuid::Uuid;
//use tokio::sync::Mutex;
use metrics::{counter, histogram, increment_counter};

use crate::{store::storage::{StorageWrapper, LQStorage, get_lq_key, DropLQWatcherMsg, RowData}, utils::{type_aliases::JSONValue, filter::get_sql_for_filters}};

use super::{filter::Filter, mtx::mtx::{new_mtx}};

pub fn time_since_epoch() -> Duration {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap()
}
pub fn time_since_epoch_ms() -> f64 {
    time_since_epoch().as_secs_f64() * 1000f64
}

/*pub struct GQLSet<T> { pub nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }*/

//#[async_trait]
pub trait GQLSet<T> {
    fn from(entries: Vec<T>) -> Self;
    //async fn nodes(&self) -> &Vec<T>;
    fn nodes(&self) -> &Vec<T>;
}

/*type QueryFunc_ResultType = Result<Vec<Row>, tokio_postgres::Error>;
type QueryFunc = Box<
    dyn Fn(&str, &[&(dyn ToSql + Sync)])
    ->
    Pin<Box<
        dyn Future<Output = QueryFunc_ResultType>
    >>
>;
fn force_boxed<T>(f: fn(&str, &[&(dyn ToSql + Sync)]) -> T) -> QueryFunc
where
    T: Future<Output = QueryFunc_ResultType> + 'static,
{
    Box::new(move |a, b| Box::pin(f(a, b)))
}*/

pub async fn get_entries_in_collection_basic</*'a,*/ T: From<Row> + Serialize, QueryFunc, QueryFuncReturn>(
    query_func: QueryFunc, table_name: &str, filter: &Filter
) -> Result<(Vec<RowData>, Vec<T>), Error>
where
    QueryFunc: FnOnce(String/*, &'a [&(dyn ToSql + Sync)]*/) -> QueryFuncReturn,
    QueryFuncReturn: Future<Output = Result<Vec<Row>, tokio_postgres::Error>>,
{
    let time1 = Instant::now();

    let filters_sql = get_sql_for_filters(filter).with_context(|| format!("Got error while getting sql for filter:{filter:?}"))?;
    let where_clause = match filters_sql.len() {
        0..=2 => "".to_owned(),
        _ => " WHERE ".to_owned() + &filters_sql,
    };
    println!("Running where clause. @table:{table_name} @{where_clause} @filter:{filter:?}");
    let mut rows = query_func(format!("SELECT * FROM \"{table_name}\"{where_clause};")/*, &[]*/).await
        .with_context(|| format!("Error running select command for entries in table. @table:{table_name} @filters_sql:{filters_sql}"))?;

    let time2 = Instant::now();

    // sort by id, so that order of our results here is consistent with order after live-query-updating modifications (see storage.rs)
    rows.sort_by_key(|a| a.get::<&str, String>("id"));

    //let entries: Vec<JSONValue> = rows.into_iter().map(|r| r.into()).collect();
    let entries_as_type: Vec<T> = rows.into_iter().map(|r| r.into()).collect();
    //let entries: Vec<JSONValue> = entries_as_type.iter().map(|r| serde_json::to_value(r).unwrap()).collect();
    let entries: Vec<RowData> = entries_as_type.iter().map(|r| {
        let json_val = serde_json::to_value(r).unwrap();
        json_val.as_object().unwrap().clone()
    }).collect();

    histogram!("get_entries_in_collection_basic.part1", time2.duration_since(time1).as_secs_f64() * 1000f64);
    histogram!("get_entries_in_collection_basic.part2", Instant::now().duration_since(time2).as_secs_f64() * 1000f64);

    Ok((entries, entries_as_type))
}
pub async fn get_entries_in_collection</*'a,*/ T: From<Row> + Serialize>(ctx: &async_graphql::Context<'_>, table_name: &str, filter: &Filter) -> Result<(Vec<RowData>, Vec<T>), Error> {
    //let client = ctx.data::<Client>().unwrap();
    let pool = ctx.data::<Pool>().unwrap();
    let client = pool.get().await.unwrap();

    let query_func = |str1: String| async move {
        client.query(&str1, &[]).await
    };
    let (entries, entries_as_type) = get_entries_in_collection_basic(query_func, table_name, filter).await.unwrap();
    Ok((entries, entries_as_type))
}

pub fn json_values_to_typed_entries<T: From<Row> + Serialize + DeserializeOwned>(json_entries: Vec<JSONValue>) -> Vec<T> {
    json_entries.into_iter().map(|a| serde_json::from_value(a).unwrap()).collect()
}
pub fn json_maps_to_typed_entries<T: From<Row> + Serialize + DeserializeOwned>(json_entries: Vec<Map<String, JSONValue>>) -> Vec<T> {
    json_entries.into_iter().map(|a| serde_json::from_value(serde_json::Value::Object(a)).unwrap()).collect()
}

pub struct MyStruct<'a, 'b> {
    pub parent: Option<&'a mut MyStruct<'b, 'b>>,
}
pub fn test1() -> String {
    let mut str1 = MyStruct { parent: None };
    {
        let temp = &mut str1;
        test2(temp);
    };

    let temp2 = &mut str1;
    test3(temp2);
    "".to_owned()
}
pub fn test2<'a>(borrow_str: &'a MyStruct<'_, '_>) {
}
pub fn test3<'a>(borrow_str: &'a mut MyStruct<'_, '_>) {
}

pub async fn handle_generic_gql_collection_request<'a,
    T: 'a + From<Row> + Serialize + DeserializeOwned + Send + Clone,
    GQLSetVariant: 'a + GQLSet<T> + Send + Clone + Sync,
>(ctx: &'a async_graphql::Context<'a>, table_name: &'a str, filter: Filter) -> impl Stream<Item = GQLSetVariant> + 'a {
    new_mtx!(mtx, "part1");
    let (entries_as_type, stream_id, sender_for_dropping_lq_watcher, lq_entry_receiver_clone) = {
        let storage_wrapper = ctx.data::<StorageWrapper>().unwrap();
        let mut storage = storage_wrapper.lock().await;
        let sender = storage.get_sender_for_lq_watcher_drops();

        /*let mut stream = GQLResultStream::new(storage_wrapper.clone(), collection_name, filter.clone(), GQLSetVariant::from(entries));
        let stream_id = stream.id.clone();*/
        let stream_id = Uuid::new_v4();
        let (entries_as_type, watcher) = storage.start_lq_watcher::<T>(table_name, &filter, stream_id, ctx, Some(&mtx)).await;

        (entries_as_type, stream_id, sender, watcher.new_entries_channel_receiver.clone())
    };

    mtx.section("part2");
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
    new_mtx!(mtx, "part1");
    //tokio::time::sleep(std::time::Duration::from_millis(123456789)).await; // temp
    let filter = Some(json!({"id": {"equalTo": id}}));
    let (entry_as_type, stream_id, sender_for_dropping_lq_watcher, lq_entry_receiver_clone) = {
        let storage_wrapper = ctx.data::<StorageWrapper>().unwrap();
        let mut storage = storage_wrapper.lock().await;
        let sender = storage.get_sender_for_lq_watcher_drops();

        /*let mut stream = GQLResultStream::new(storage_wrapper.clone(), table_name, filter.clone(), GQLSetVariant::from(entries));
        let stream_id = stream.id.clone();*/
        let stream_id = Uuid::new_v4();
        let (mut entries_as_type, watcher) = storage.start_lq_watcher::<T>(table_name, &filter, stream_id, ctx, Some(&mtx)).await;
        let entry_as_type = entries_as_type.pop();

        (entry_as_type, stream_id, sender, watcher.new_entries_channel_receiver.clone())
    };

    mtx.section("part2");
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