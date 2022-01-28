use std::{error::Error, any::TypeId, pin::Pin, task::{Poll, Waker}, sync::{Arc, Mutex}, time::Duration, collections::VecDeque};
use anyhow::bail;
use async_graphql::{Result, async_stream::{stream, self}, Context, OutputType, Object, Positioned, parser::types::Field};
use futures_util::{Stream, StreamExt, Future, stream, TryFutureExt};
use serde::Serialize;
use serde_json::json;
use tokio_postgres::{Client, Row};
//use tokio::sync::Mutex;

use crate::store::storage::{Storage, LQStorage};

pub struct GQLResultStream<'a, T> {
    // set at init
    storage_wrapper: &'a Arc<Mutex<LQStorage>>,
    collection_name: String,
    filter: Option<serde_json::Value>,
    // for changes
    waker: Option<Waker>,
    new_entries_to_return: VecDeque<T>,
}
impl<'a, T> GQLResultStream<'a, T> {
    pub fn new(storage_wrapper: &'a Arc<Mutex<LQStorage>>, collection_name: &str, filter: Option<serde_json::Value>, first_entry: T) -> Self {
        Self {
            storage_wrapper: storage_wrapper,
            collection_name: collection_name.to_owned(),
            filter,
            waker: None,
            new_entries_to_return: vec![first_entry],
        }
    }

    pub fn push_entry(&mut self, new_entry: T) {
        self.new_entries_to_return.append(new_entry);
        self.waker.wake();
    }
}
impl<'a, T> Drop for GQLResultStream<'a, T> {
    fn drop(&mut self) {
        //println!("Stream_WithDropListener got dropped. @address:{:p} @collection:{} @filter:{:?}", self, self.collection_name, self.filter);
        //let mut storage: LQStorage = storage_wrapper.to_owned();
        //let storage = self.storage_wrapper.lock.await;
        let mut guard = self.storage_wrapper.lock();
        let storage = guard.as_mut().unwrap();
        storage.notify_lq_end(self.collection_name.as_str(), &self.filter);
    }
}
impl<'a, T> Stream for GQLResultStream<'a, T> {
    type Item = T;
    fn poll_next(mut self: Pin<&mut Self>, c: &mut std::task::Context<'_>) -> Poll<Option<<Self as Stream>::Item>> {
        self.waker = Some(c.waker());
        let next_entry = self.new_entries_to_return.pop_front();
        match next_entry {
            Some(next_entry) => Poll::Ready(next_entry),
            None => Poll::Pending,
        }
    }
}