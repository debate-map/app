use std::{error::Error, any::TypeId, pin::Pin, task::{Poll, Waker}, sync::{Arc, Mutex}, time::Duration};
use anyhow::bail;
use async_graphql::{Result, async_stream::{stream, self}, Context, OutputType, Object, Positioned, parser::types::Field};
use futures_util::{Stream, StreamExt, Future, stream, TryFutureExt};
use serde::Serialize;
use serde_json::json;
use tokio_postgres::{Client, Row};
//use tokio::sync::Mutex;

use crate::store::storage::{Storage, LQStorage};

use super::gql_result_stream::GQLResultStream;

// temp (these will not be useful once the streams are live/auto-update)
pub async fn get_first_item_from_stream_in_result_in_future<T, U: std::fmt::Debug>(result: impl Future<Output = Result<impl Stream<Item = T>, U>>) -> T {
    let stream = result.await.unwrap();
    get_first_item_from_stream(stream).await
}
pub async fn get_first_item_from_stream<T>(stream: impl Stream<Item = T>) -> T {
    let first_item = stream.collect::<Vec<T>>().await.pop().unwrap();
    first_item
}

pub fn get_sql_for_filters(filter: &Option<serde_json::Value>) -> Result<String, anyhow::Error> {
    if filter.is_none() { return Ok("".to_owned()); }
    let filter = filter.as_ref().unwrap();

    let mut parts: Vec<String> = vec![];
    // todo: replace this code-block with one that is safe (ie. uses escaping and such)
    for (prop_name, prop_filters) in filter.as_object().unwrap() {
        //if let Some((filter_type, filter_value)) = prop_filters.as_object().unwrap().iter().next() {
        for (filter_type, filter_value) in prop_filters.as_object().unwrap() {
            parts.push(match filter_type.as_str() {
                "equalTo" => format!("\"{prop_name}\" = {}", filter_value.to_string().replace("\"", "'")),
                "in" => format!("\"{prop_name}\" IN {}", filter_value.to_string().replace("\"", "'").replace("[", "(").replace("]", ")")),
                // see: https://stackoverflow.com/a/54069718
                //"contains" => format!("ANY(\"{prop_name}\") = {}", filter_value.to_string().replace("\"", "'")),
                "contains" => format!("\"{prop_name}\" @> {}", "'{".to_owned() + &filter_value.to_string() + "}'"),
                //"contains_jsonb" => format!("\"{prop_name}\" @> {filter_value_as_jsonb_str}"),
                _ => bail!(r#"Invalid filter-type "{filter_type}" specified. Supported: equalTo, in, contains."#),
            });
        }
    }
    let result = "(".to_owned() + &parts.join(") AND (") + ")";
    Ok(result)
}

/*pub struct GQLSet<T> { pub nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }*/

//#[async_trait]
pub trait GQLSet<T> {
    fn from(entries: Vec<T>) -> Self;
    //async fn nodes(&self) -> &Vec<T>;
    fn nodes(&self) -> &Vec<T>;
}

pub async fn get_entries_in_collection<T: From<Row>>(ctx: &Context<'_>, collection_name: &str, filter: &Option<serde_json::Value>) -> Vec<T> {
    let client = ctx.data::<Client>().unwrap();

    let filters_sql = match get_sql_for_filters(&filter) {
        Ok(a) => a,
        //Err(err) => return stream::once(async { err }),
        Err(err) => panic!("Got error while applying filters:{err}"),
    };
    let where_clause = match filters_sql.len() {
        0..=2 => "".to_owned(),
        _ => " WHERE ".to_owned() + &filters_sql,
    };
    println!("Running where clause:{where_clause} @filter:{filter:?}");
    let rows = client.query(&format!("SELECT * FROM \"{collection_name}\"{where_clause};"), &[]).await.unwrap();
    let entries: Vec<T> = rows.into_iter().map(|r| r.into()).collect();
    entries
}
pub async fn handle_generic_gql_collection_request<'a,
    T: 'static + From<Row> + Send + Clone,
    GQLSetVariant: 'static + GQLSet<T> + Send + Clone + Sync,
>(ctx: &'a Context<'_>, collection_name: &str, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSetVariant> + 'a {
    let entries: Vec<T> = get_entries_in_collection::<T>(ctx, collection_name, &filter).await;

    let storage_wrapper = ctx.data::<Storage>().unwrap();
    let mut guard = storage_wrapper.lock();
    let storage = guard.as_mut().unwrap();
    
    let stream = GQLResultStream::new(storage_wrapper, collection_name, filter, GQLSetVariant::from(entries));
    storage.notify_lq_start(&collection_name, &filter, |new_entries| {
        stream.push_entry(new_entries);
    });
    stream
}
pub async fn handle_generic_gql_doc_request<'a,
    T: 'static + From<Row> + Send + Clone,
    GQLSetVariant: 'static + GQLSet<T> + Send + Clone + Sync,
>(ctx: &'a Context<'_>, collection_name: &str, id: &str) -> impl Stream<Item = Option<T>> + 'a {
    let filter = Some(json!({"id": {"equalTo": id}}));
    let mut entries: Vec<T> = get_entries_in_collection::<T>(ctx, collection_name, &filter).await;
    let entry = entries.pop();

    let storage_wrapper = ctx.data::<Storage>().unwrap();
    let mut guard = storage_wrapper.lock();
    let storage = guard.as_mut().unwrap();

    let stream = GQLResultStream::new(storage_wrapper, collection_name, filter, entry);
    storage.notify_lq_start(&collection_name, &filter, |new_entries| {
        stream.push_entry(new_entries);
    });
    stream
}

/*pub struct Stream_WithDropListener<'a, T> {
    inner_stream: Pin<Box<dyn Stream<Item = T> + Send>>,
    storage_wrapper: &'a Arc<Mutex<LQStorage>>,
    collection_name: String,
    filter: Option<serde_json::Value>,
}
impl<'a, T> Stream_WithDropListener<'a, T> {
    pub fn new(inner_stream_new: impl Stream<Item = T> + Send + 'static, storage_wrapper: &'a Arc<Mutex<LQStorage>>, collection_name: &str, filter: Option<serde_json::Value>) -> Self {
        Self {
            inner_stream: Box::pin(inner_stream_new),
            storage_wrapper: storage_wrapper,
            collection_name: collection_name.to_owned(),
            filter,
        }
    }
}
impl<'a, T> Drop for Stream_WithDropListener<'a, T> {
    fn drop(&mut self) {
        //println!("Stream_WithDropListener got dropped. @address:{:p} @collection:{} @filter:{:?}", self, self.collection_name, self.filter);
        //let mut storage: LQStorage = storage_wrapper.to_owned();
        //let storage = self.storage_wrapper.lock.await;
        let mut guard = self.storage_wrapper.lock();
        let storage = guard.as_mut().unwrap();
        storage.notify_lq_end(self.collection_name.as_str(), &self.filter);
    }
}
impl<'a, T> Stream for Stream_WithDropListener<'a, T> {
    type Item = T;
    fn poll_next(mut self: Pin<&mut Self>, c: &mut std::task::Context<'_>) -> Poll<Option<<Self as Stream>::Item>> {
        self.inner_stream.as_mut().poll_next(c)
    }
}*/