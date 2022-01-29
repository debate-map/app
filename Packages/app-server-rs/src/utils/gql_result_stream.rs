use std::{error::Error, any::TypeId, pin::Pin, task::{Poll, Waker}, sync::{Arc, Mutex}, time::Duration, collections::VecDeque};
use anyhow::bail;
use async_graphql::{Result, async_stream::{stream, self}, Context, OutputType, Object, Positioned, parser::types::Field};
use futures_util::{Stream, StreamExt, Future, stream, TryFutureExt};
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio::sync::mpsc::{self, Sender, Receiver};
use tokio_postgres::{Client, Row};
use uuid::Uuid;
//use tokio::sync::Mutex;

use crate::store::storage::{Storage, LQStorage, LQChangeListener};

use super::{general::GQLSet, type_aliases::JSONValue};

pub struct GQLResultStream<'a, ResultT> {
    // set at init
    pub id: Uuid,
    storage_wrapper: Arc<Mutex<LQStorage<'a>>>,
    collection_name: String,
    filter: Option<serde_json::Value>,
    // for changes
    waker: Option<Waker>,
    new_results_to_return: VecDeque<ResultT>,
}
impl<'a, ResultT: Send + Sync + 'static> GQLResultStream<'a, ResultT> {
    pub fn new(
        storage_wrapper: Arc<Mutex<LQStorage<'a>>>,
        collection_name: &str,
        filter: Option<serde_json::Value>,
        first_result: ResultT,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            storage_wrapper: storage_wrapper,
            collection_name: collection_name.to_owned(),
            filter: filter,
            waker: None,
            new_results_to_return: VecDeque::from(vec![first_result]),
        }
    }
    /*pub fn create_channel(&mut self) -> Sender<ResultT> {
        let (tx, rx): (Sender<ResultT>, Receiver<ResultT>) = mpsc::channel(100);
        let self_arc = Arc::new(self);
        tokio::spawn(async move {
            loop {
                let new_result = rx.recv().await.unwrap();
                self_arc.push_result(new_result);
            }
        });
        return tx;
    }*/

    pub fn push_result(&mut self, new_result: ResultT) {
        self.new_results_to_return.push_back(new_result);
        self.waker.clone().unwrap().wake();
    }
}
impl<'a, ResultT> Unpin for GQLResultStream<'a, ResultT> {} // enables the mutations of self below
impl<'a, ResultT> Stream for GQLResultStream<'a, ResultT> {
    type Item = ResultT;
    fn poll_next(mut self: Pin<&mut Self>, c: &mut std::task::Context<'_>) -> Poll<Option<<Self as Stream>::Item>> {
        self.waker = Some(c.waker().clone());
        let next_result = self.new_results_to_return.pop_front();
        match next_result {
            Some(next_result) => Poll::Ready(Some(next_result)),
            None => Poll::Pending,
        }
    }
}
impl<'a, ResultT> Drop for GQLResultStream<'a, ResultT> {
    fn drop(&mut self) {
        //println!("Stream_WithDropListener got dropped. @address:{:p} @collection:{} @filter:{:?}", self, self.collection_name, self.filter);
        //let mut storage: LQStorage = storage_wrapper.to_owned();
        //let storage = self.storage_wrapper.lock.await;
        let mut guard = self.storage_wrapper.lock();
        let storage = guard.as_mut().unwrap();
        storage.notify_lq_end(self.collection_name.as_str(), &self.filter, self.id);
    }
}