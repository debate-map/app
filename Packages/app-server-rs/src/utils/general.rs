use async_graphql::{Result};
use futures_util::{Stream, StreamExt, Future};

// temp (these will not be useful once the streams are live/auto-update)
pub async fn get_first_item_from_stream_in_result_in_future<T, U: std::fmt::Debug>(result: impl Future<Output = Result<impl Stream<Item = T>, U>>) -> T {
    let stream = result.await.unwrap();
    get_first_item_from_stream(stream).await
}
pub async fn get_first_item_from_stream<T>(stream: impl Stream<Item = T>) -> T {
    let first_item = stream.collect::<Vec<T>>().await.pop().unwrap();
    first_item
}

pub fn apply_gql_filter<T>(filter: &Option<serde_json::Value>, entries: Vec<T>) -> Vec<T> {
    let before_length = entries.len();
    let result: Vec<T> = entries.into_iter().filter(|entry| {
        match &filter {
            Some(filter) => {
                // todo: equalTo, in, contains
                false
            },
            None => true
        }
    }).collect();
    println!("Filtering... @before:{} @filter:{:?} @after:{}", before_length, filter, result.len());
    // todo
    result
}