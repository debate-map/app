use super::lq_key::LQKey;
use crate::async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use crate::async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use crate::async_graphql::{Data, MergedObject, MergedSubscription, ObjectType, Result, Schema, SubscriptionType};
use crate::flume::{self, unbounded, Receiver, Sender};
use crate::serde::de::DeserializeOwned;
use crate::serde::{Deserialize, Serialize};
use crate::serde_json::{self, json, Map};
use crate::tokio::sync::{mpsc, Mutex, RwLock};
use crate::tokio_postgres::{Client, Row};
use crate::tracing::error;
use crate::utils::general::general::rw_locked_hashmap__get_entry_or_insert_with;
use crate::utils::mtx::mtx::new_mtx;
use crate::utils::mtx::mtx::Mtx;
use crate::uuid::Uuid;
use crate::{axum, binary_search_insert, cf, check_lock_order, futures, lock_as_usize_LQInstance_last_entries, tower, tower_http, Assert, CountAndSize, EntryBlob, IsTrue, JSONValue, LQInstanceStats, Lock, MonitorEvent};
use crate::{entry_blob_matches_filter, QueryFilter};
use crate::{get_entries_in_collection, ToOwnedV};
use crate::{JSONValueV, LDChange};
use anyhow::Context;
use axum::extract::ws::{CloseFrame, Message};
use axum::extract::{FromRequest, WebSocketUpgrade};
use axum::http::header::CONTENT_TYPE;
use axum::http::Method;
use axum::http::{self, Request, Response, StatusCode};
use axum::response::{self, IntoResponse};
use axum::routing::{get, on_service, post, MethodFilter};
use axum::Error;
use axum::{extract, Router};
use futures_util::future::{BoxFuture, Ready};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{future, FutureExt, Sink, SinkExt, Stream, StreamExt};
use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::convert::Infallible;
use std::future::Future;
use std::pin::Pin;
use std::rc::Rc;
use std::str::FromStr;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use tower::Service;
use tower_http::cors::CorsLayer;

/*pub enum LQChange {
	/// Used for initial data-set. (or when the entire data-set is replaced, albeit this does not currently occur)
	VecChange(Vec<EntryBlob>),
	/// Used for individual entry changes. (based on entries being added/changed/removed, as a result of observed database changes)
	Delta(json_patch::PatchOperation),
}*/
#[derive(Clone)]
pub enum LQChange {
	/// This change should *not* normally occur; this is merely a workaround in case of error in synchronization system. (see `LQGroupImpl::on_batch_completed` in lq_group_impl.rs)
	/// Note: The contained Vec is already sorted by id.
	FullList(Vec<EntryBlob>),
	EntryAdded(String, EntryBlob),
	EntryChanged(String, EntryBlob),
	EntryRemoved(String),
}

#[derive(Debug, Clone)]
pub struct LQEntryWatcher {
	pub lq_changes_channel_sender: Sender<LQChange>,
	pub lq_changes_channel_receiver: Receiver<LQChange>,
}
impl LQEntryWatcher {
	pub fn new() -> Self {
		let (s1, r1): (Sender<LQChange>, Receiver<LQChange>) = flume::unbounded();
		Self { lq_changes_channel_sender: s1, lq_changes_channel_receiver: r1 }
	}
}

/// Holds the data related to a specific query (ie. collection-name + filter).
#[derive(Debug)]
pub struct LQInstance {
	pub lq_key: LQKey,
	// TODO: Maybe change this eventually to operate on EntryJSON's instead. (as then the filtering logic in this file operates on the same "shape" as the graphql-caller uses when specifying its "filter")
	/// (all setters/modifiers of this field must ensure that the entries are sorted by id)
	pub last_entries: RwLock<Vec<EntryBlob>>,
	pub last_entries_set_count: AtomicU64,
	pub entry_watchers: RwLock<HashMap<Uuid, LQEntryWatcher>>,
}
impl LQInstance {
	pub fn new(lq_key: LQKey, mut initial_entries: Vec<EntryBlob>) -> Self {
		initial_entries.sort_by_key(|a| a["id"].as_string().unwrap()); // sort entries by id (LQInstance.last_entries must always be sorted by id)
		Self { lq_key, last_entries: RwLock::new(initial_entries), last_entries_set_count: AtomicU64::new(0), entry_watchers: RwLock::new(HashMap::new()) }
	}

	pub async fn send_monitor_event_for_data(&self, entries: Vec<EntryBlob>, watcher_count: usize) {
		//let lq_key = get_lq_instance_key(&self.table_name, &self.filter);
		let message = self.get_lq_instance_updated_message(entries, watcher_count);
		/*if let Err(err) = MESSAGE_SENDER_TO_MONITOR_BACKEND.0.broadcast(message).await {
			error!("Errored while broadcasting LQInstanceUpdated message. @error:{}", err);
		}*/
		(cf().on_monitor_event)(message);
	}
	pub fn get_lq_instance_updated_message(&self, entries: Vec<EntryBlob>, watcher_count: usize) -> MonitorEvent {
		MonitorEvent::LQInstanceUpdated {
			table_name: self.lq_key.table_name.clone(),
			filter: serde_json::to_value(self.lq_key.filter.clone()).unwrap(),
			last_entries: entries,
			watchers_count: watcher_count as u32,
			deleting: false, // deletion event is sent from drop_lq_watcher func in lq_group.rs
		}
	}

	pub async fn get_or_create_watcher(&self, stream_id: Uuid, current_entries: Vec<EntryBlob>) -> (LQEntryWatcher, bool, usize) {
		/*let entry_watchers = self.entry_watchers.write().await;
		let create_new = !self.entry_watchers.contains_key(&stream_id);
		let watcher = self.entry_watchers.entry(stream_id).or_insert_with(LQEntryWatcher::new);
		(watcher, create_new)*/
		let (watcher, just_created, new_count) = rw_locked_hashmap__get_entry_or_insert_with(&self.entry_watchers, stream_id, LQEntryWatcher::new).await;
		self.send_monitor_event_for_data(current_entries, new_count).await;
		(watcher, just_created, new_count)
	}
	/*pub fn get_or_create_watcher(&mut self, stream_id: Uuid) -> (&LQEntryWatcher, usize) {
		let watcher = self.entry_watchers.entry(stream_id).or_insert(LQEntryWatcher::new());
		(&watcher, self.entry_watchers.len())
		/*if self.entry_watchers.contains_key(&stream_id) {
			return (self.entry_watchers.get(&stream_id).unwrap(), self.entry_watchers.len());
		}
		let watcher = LQEntryWatcher::new();
		self.entry_watchers.insert(stream_id, watcher);
		(&watcher, self.entry_watchers.len())*/
	}*/

	pub async fn on_table_changed(&self, change: &LDChange, mtx_p: Option<&Mtx>) {
		new_mtx!(mtx, "1:get last_entries read-lock, clone, then drop lock", mtx_p);
		let mut next_entries = self.last_entries.read().await.clone();

		mtx.section("2:calculate new_entries");
		let mut lq_change: Option<LQChange> = None;
		match change.kind.as_str() {
			"insert" => {
				let new_entry = change.new_data_as_entry_blob().unwrap();
				let filter_check_result = entry_blob_matches_filter(&new_entry, &self.lq_key.filter).expect(&format!("Failed to execute filter match-check on new database entry. @table:{} @filter:{:?}", self.lq_key.table_name, self.lq_key.filter));
				if filter_check_result {
					let entry_id = new_entry["id"].as_string().unwrap();
					binary_search_insert(&mut next_entries, new_entry.clone(), |a, b| a["id"].as_str().cmp(&b["id"].as_str()));
					lq_change = Some(LQChange::EntryAdded(entry_id, new_entry));
				}
			},
			"update" => {
				let new_data = change.new_data_as_entry_blob().unwrap();
				let entry_id = new_data["id"].as_string().unwrap();
				let entry_index = next_entries.iter_mut().position(|a| a["id"].as_str() == Some(&entry_id));

				match entry_index {
					// if given row-id was already part of result-set...
					Some(entry_index) => {
						let filter_check_result = entry_blob_matches_filter(&new_data, &self.lq_key.filter).expect(&format!("Failed to execute filter match-check on updated database entry. @table:{} @filter:{:?}", self.lq_key.table_name, self.lq_key.filter));
						match filter_check_result {
							// ...and it's still part of result-set, then EntryChanged
							true => {
								// update the target entry's data to reflect the current change
								/*for key in new_data.keys() {
									entry.insert(key.to_owned(), new_data[key].clone());
								}*/
								next_entries[entry_index] = new_data.clone();
								lq_change = Some(LQChange::EntryChanged(entry_id, new_data));
							},
							// ...but it's no longer part of result-set, then EntryRemoved
							false => {
								next_entries.remove(entry_index);
								lq_change = Some(LQChange::EntryRemoved(entry_id));
							},
						};
					},
					// if given row-id wasn't part of result-set...
					None => {
						let filter_check_result = entry_blob_matches_filter(&new_data, &self.lq_key.filter).expect(&format!("Failed to execute filter match-check on updated database entry. @table:{} @filter:{:?}", self.lq_key.table_name, self.lq_key.filter));
						// ...but it is now, then EntryAdded
						if filter_check_result {
							binary_search_insert(&mut next_entries, new_data.clone(), |a, b| a["id"].as_str().cmp(&b["id"].as_str()));
							lq_change = Some(LQChange::EntryAdded(entry_id, new_data));
						}
					},
				};
			},
			"delete" => {
				let entry_id = change.get_row_id();
				let entry_index = next_entries.iter().position(|a| a["id"].as_str().unwrap() == entry_id);
				match entry_index {
					Some(entry_index) => {
						next_entries.remove(entry_index);
						lq_change = Some(LQChange::EntryRemoved(entry_id));
					},
					None => {},
				};
			},
			_ => {
				// ignore any other types of change (no need to even tell the watchers about it)
				return;
			},
		};
		let lq_change = match lq_change {
			// return now if no live-query-relevant change occurred
			None => return,
			// else, continue and notify the watchers of the changes
			Some(a) => a,
		};

		//next_entries.sort_by_key(|a| a["id"].as_str().unwrap().to_owned()); // sort entries by id, so there is a consistent ordering

		mtx.section("3:get entry_watchers read-lock, then notify each watcher of new_entries");
		let entry_watchers = self.entry_watchers.read().await;
		for (_watcher_stream_id, watcher) in entry_watchers.iter() {
			watcher.lq_changes_channel_sender.send(lq_change.clone()).unwrap();
		}

		mtx.section("4:update the last_entries list");
		self.set_last_entries::<{ Lock::LQInstance_entry_watchers }>(next_entries.clone()).await;

		self.send_monitor_event_for_data(next_entries, entry_watchers.len()).await;
	}

	/// (`new_entries` must be sorted by id)
	pub async fn set_last_entries<const PRIOR_LOCK: Lock>(&self, mut new_entries: Vec<EntryBlob>)
	where
		Assert<{ (PRIOR_LOCK as usize) < lock_as_usize_LQInstance_last_entries!() }>: IsTrue,
	{
		//check_lock_order_usize::<{PRIOR_LOCK as usize}, {Lock::LQInstance_last_entries as usize}>();
		let mut last_entries = self.last_entries.write().await;
		last_entries.drain(..);
		last_entries.append(&mut new_entries);
		// no need to sort here; the two callers of set_last_entries already apply/preserve sorting-by-id
		self.last_entries_set_count.fetch_add(1, Ordering::SeqCst);
	}

	pub async fn get_last_entry_with_id(&self, entry_id: &str) -> Option<EntryBlob> {
		let last_entries = self.last_entries.read().await;
		last_entries
			.iter()
			.find(|entry2| {
				let entry2_id = entry2.get("id").and_then(|a| a.as_str()).map_or("", |a| a);
				entry2_id == entry_id
			})
			.cloned()
	}

	/*pub async fn await_next_entries(&mut self, stream_id: Uuid) -> Vec<JSONValue> {
		let watcher = self.get_or_create_watcher(stream_id);
		let new_result = watcher.new_entries_channel_receiver.recv_async().await.unwrap();
		new_result
	}*/

	pub async fn get_stats(&self) -> Result<LQInstanceStats, Error> {
		let last_entries = self.last_entries.read().await;
		let last_entries_as_json_objects: Vec<JSONValue> = last_entries.iter().map(|a| JSONValue::Object(a.0.clone())).collect();
		let entry_watchers = self.entry_watchers.read().await;
		const MB_AS_BYTES: f64 = 1024f64 * 1024f64;

		let mut result = LQInstanceStats {
			key: self.lq_key._str.clone(),
			last_entries: CountAndSize { count: last_entries.len() as u64, size_mb: sizeof_vals(last_entries_as_json_objects.iter().collect()) as f64 / MB_AS_BYTES },
			last_entries_set_count: self.last_entries_set_count.load(Ordering::SeqCst),
			entry_watchers: entry_watchers.len() as u64,
			entry_watcher_channel_messages_for_changes: vec![],
		};
		for (_watcher_stream_id, watcher) in entry_watchers.iter() {
			result.entry_watcher_channel_messages_for_changes.push(watcher.lq_changes_channel_receiver.len() as u64);
		}
		Ok(result)
	}
}
/*impl Drop for LQInstance {
	fn drop(&mut self) {
		let table_name = self.table_name.to_owned();
		let filter = self.filter.clone();
		// there might be an issue here where this async-chain ends up broadcasting later than it should, causing it to "overwrite" some "later" event
		// todo: fix this possible issue (perhaps by storing timestamp here, then canceling broadcast if another broadcast occurs before our actual broadcast)
		tokio::spawn(async move {
			//let lq_key = get_lq_instance_key(&self.table_name, &self.filter);
			if let Err(err) = MESSAGE_SENDER_TO_MONITOR_BACKEND.0.broadcast(Message_ASToMB::LQInstanceUpdated {
				table_name,
				filter: serde_json::to_value(filter).unwrap(),
				last_entries: vec![],
				watchers_count: 0u32,
				deleting: true,
			}).await {
				error!("Errored while broadcasting LQInstanceUpdated message. @error:{}", err);
			}
		});
	}
}*/

fn sizeof_vals(v: Vec<&serde_json::Value>) -> usize {
	std::mem::size_of::<Vec<serde_json::Value>>() + v.into_iter().map(sizeof_val).sum::<usize>()
}
// from :https://stackoverflow.com/a/76456111
fn sizeof_val(v: &serde_json::Value) -> usize {
	std::mem::size_of::<serde_json::Value>()
		+ match v {
			serde_json::Value::Null => 0,
			serde_json::Value::Bool(_) => 0,
			serde_json::Value::Number(_) => 0, // Incorrect if arbitrary_precision is enabled. oh well
			serde_json::Value::String(s) => s.capacity(),
			serde_json::Value::Array(a) => a.iter().map(sizeof_val).sum::<usize>() + a.capacity() * std::mem::size_of::<serde_json::Value>(),
			serde_json::Value::Object(o) => o
				.iter()
				.map(|(k, v)| {
					std::mem::size_of::<String>() + k.capacity() + sizeof_val(v) + std::mem::size_of::<usize>() * 3
					// As a crude approximation, I pretend each map entry has 3 words of overhead
				})
				.sum(),
		}
}
