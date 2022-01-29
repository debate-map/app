use std::{error::Error, any::TypeId, pin::Pin, task::{Poll, Waker}, time::Duration};
use anyhow::bail;
use async_graphql::{Result, async_stream::{stream, self}, Context, OutputType, Object, Positioned, parser::types::Field};
use futures_util::{Stream, StreamExt, Future, stream, TryFutureExt};
use serde::{Serialize, Deserialize, de::DeserializeOwned};
use serde_json::json;
use tokio_postgres::{Client, Row};
use uuid::Uuid;
//use tokio::sync::Mutex;

use crate::store::storage::{Storage, LQStorage, get_lq_key};

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
    T: 'a + From<Row> + Send + Clone + DeserializeOwned,
    GQLSetVariant: 'a + GQLSet<T> + Send + Clone + Sync,
>(ctx: &'a Context<'a>, collection_name: &'a str, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSetVariant> + 'a {
    println!("TestCol_1");
    let entries: Vec<T> = get_entries_in_collection::<T>(ctx, collection_name, &filter).await;
    println!("TestCol_2");

    let storage_wrapper = ctx.data::<Storage>().unwrap();
    let mut storage = storage_wrapper.lock().await;
    println!("TestCol_3");

    /*let mut stream = GQLResultStream::new(storage_wrapper.clone(), collection_name, filter.clone(), GQLSetVariant::from(entries));
    let stream_id = stream.id.clone();*/
    let stream_id = Uuid::new_v4();
    storage.notify_lq_start(&collection_name, &filter, stream_id);
    println!("TestCol_4");

    let lq_key = get_lq_key(collection_name, &filter);
    let lq_entry = storage.live_queries.get(&lq_key).unwrap();
    println!("TestCol_5");

    let filter_clone = filter.clone();
    let mut base_stream = async_stream::stream! {
        loop {
            println!("TestCol_6");
            let storage_wrapper = ctx.data::<Storage>().unwrap();
            let mut storage = storage_wrapper.lock().await;
            let lq_key = get_lq_key(collection_name, &filter_clone);
            let mut lq_entry = storage.live_queries.get_mut(&lq_key).unwrap();
            println!("TestCol_7");

            let next_entries = lq_entry.await_next_entries(stream_id).await;
            let new_entries_as_type: Vec<T> = next_entries.into_iter().map(|a| serde_json::from_value(a.clone()).unwrap()).collect();
            println!("TestCol_8");

            let next_result_set = GQLSetVariant::from(new_entries_as_type);
            println!("TestCol_9");
            yield next_result_set;
            println!("TestCol_10");
        }
    };
    println!("TestCol_11");
    Stream_WithDropListener::new(base_stream, collection_name, filter)
}
pub async fn handle_generic_gql_doc_request<'a,
    T: 'a + From<Row> + Send + Sync + Clone + DeserializeOwned
>(ctx: &'a Context<'a>, collection_name: &'a str, id: String) -> impl Stream<Item = Option<T>> + 'a {
    println!("Test1");
    
    let filter = Some(json!({"id": {"equalTo": id}}));
    let mut entries: Vec<T> = get_entries_in_collection::<T>(ctx, collection_name, &filter).await;
    let entry = entries.pop();
    println!("Test2");

    let storage_wrapper = ctx.data::<Storage>().unwrap();
    let mut storage = storage_wrapper.lock().await;
    println!("Test3");

    /*let mut stream = GQLResultStream::new(storage_wrapper.clone(), collection_name, filter.clone(), GQLSetVariant::from(entries));
    let stream_id = stream.id.clone();*/
    let stream_id = Uuid::new_v4();
    storage.notify_lq_start(&collection_name, &filter, stream_id);
    println!("Test4");

    let lq_key = get_lq_key(collection_name, &filter);
    let mut lq_entry = storage.live_queries.get_mut(&lq_key).unwrap();
    println!("Test5");

    let filter_clone = filter.clone();
    let mut base_stream = async_stream::stream! {
        loop {
            println!("Test6");

            let storage_wrapper = ctx.data::<Storage>().unwrap();
            let mut storage = storage_wrapper.lock().await;
            let lq_key = get_lq_key(collection_name, &filter_clone);
            let mut lq_entry = storage.live_queries.get_mut(&lq_key).unwrap();
            println!("Test7");

            let next_entries = lq_entry.await_next_entries(stream_id).await;
            let next_entries_as_type: Vec<T> = next_entries.clone().into_iter().map(|a| serde_json::from_value(a.clone()).unwrap()).collect();
            println!("Test8");
            
            //let new_entry = next_entries.pop();
            let next_entry = next_entries.get(0);
            let next_result: Option<T> = match next_entry {
                Some(next_entry) => {
                    serde_json::from_value(next_entry.clone()).unwrap()
                },
                None => None
            };
            println!("Test9");
            yield next_result;
            println!("Test10");
        }
    };
    println!("Test11");
    Stream_WithDropListener::new(base_stream, collection_name, filter)
}

pub struct Stream_WithDropListener<'a, T> {
    inner_stream: Pin<Box<dyn Stream<Item = T> + 'a + Send>>,
    collection_name: String,
    filter: Option<serde_json::Value>,
}
impl<'a, T> Stream_WithDropListener<'a, T> {
    pub fn new(inner_stream_new: impl Stream<Item = T> + 'a + Send, collection_name: &str, filter: Option<serde_json::Value>) -> Self {
        Self {
            inner_stream: Box::pin(inner_stream_new),
            collection_name: collection_name.to_owned(),
            filter
        }
    }
}
impl<'a, T> Drop for Stream_WithDropListener<'a, T> {
    fn drop(&mut self) {
        println!("Stream_WithDropListener got dropped. @address:{:p} @collection:{} @filter:{:?}", self, self.collection_name, self.filter);
    }
}
impl<'a, T> Stream for Stream_WithDropListener<'a, T> {
    type Item = T;
    fn poll_next(mut self: Pin<&mut Self>, c: &mut std::task::Context<'_>) -> Poll<Option<<Self as Stream>::Item>> {
        self.inner_stream.as_mut().poll_next(c)
    }
}