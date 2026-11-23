use anyhow::{anyhow, Error};
use std::{collections::HashMap, env};

use async_graphql::{resolver_utils::enum_value, EnumType};
use axum::http::Uri;

use async_graphql::{
	async_stream::{self, stream},
	parser::types::Field,
	Object, OutputType, Positioned, Result,
};
use deadpool_postgres::Pool;
use flume::Sender;
use std::{
	any::TypeId,
	cell::RefCell,
	fmt::Display,
	iter::{empty, once},
	pin::Pin,
	sync::atomic::{AtomicU64, Ordering},
	task::{Poll, Waker},
	time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
//use flurry::Guard;
use futures_util::{stream, Future, Stream, StreamExt, TryFutureExt};
use itertools::Itertools;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{json, Map};
use tokio::sync::RwLock;
use tokio_postgres::{types::ToSql, Client, Row};
use uuid::Uuid;
//use tokio::sync::Mutex;
use std::hash::Hash;

use crate::store::live_queries::{DropLQWatcherMsg, LQStorage, LQStorageArc};

pub enum K8sEnv {
	Dev,
	Prod,
}
impl std::fmt::Debug for K8sEnv {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			Self::Dev => write!(f, "dev"),
			Self::Prod => write!(f, "prod"),
		}
	}
}

pub fn k8s_env() -> K8sEnv {
	match env::var("ENVIRONMENT").expect("An environment-variable named `ENVIRONMENT` must be provided, with value `dev` or `prod`.").as_str() {
		"dev" => K8sEnv::Dev,
		"prod" => K8sEnv::Prod,
		_ => panic!("The environment-variable named `ENVIRONMENT` must be either `dev` or `prod`."),
	}
}
pub fn k8s_dev() -> bool {
	match k8s_env() {
		K8sEnv::Dev => true,
		_ => false,
	}
}
pub fn k8s_prod() -> bool {
	match k8s_env() {
		K8sEnv::Prod => true,
		_ => false,
	}
}

pub fn get_uri_params(uri: &Uri) -> HashMap<String, String> {
	let params: HashMap<String, String> = uri.query().map(|v| url::form_urlencoded::parse(v.as_bytes()).into_owned().collect()).unwrap_or_else(HashMap::new);
	params
}

pub fn as_debug_str(obj: &impl std::fmt::Debug) -> String {
	format!("{:?}", obj)
}
pub fn as_json_str<T: serde::Serialize>(obj: &T) -> Result<String, Error> {
	let as_json_value = serde_json::to_value(obj)?;
	let as_str = as_json_value.as_str().ok_or(anyhow!("The object did not serialize to a json string!"))?;
	Ok(as_str.to_owned())
}

// project-specific; basically all our enums have derive(Serialize), so use that for serialization
pub fn enum_to_string<T: serde::Serialize>(obj: &T) -> String {
	as_json_str(obj).unwrap()
}
/*pub fn enum_to_string<T: EnumType>(obj: T) -> String {
	enum_value(obj).to_string()
}*/

/*pub fn x_is_one_of<T: Eq + std::fmt::Debug + ?Sized>(x: &T, list: &[&T]) -> Result<(), Error> {
	for val in list {
		if val.eq(&x) {
			return Ok(());
		}
	}
	Err(anyhow!("Supplied value for field does not match any of the valid options:{:?}", list))
}*/

pub fn average(numbers: &[f64]) -> f64 {
	numbers.iter().sum::<f64>() as f64 / numbers.len() as f64
}

pub fn f64_to_str_rounded(val: f64, fraction_digits: usize) -> String {
	// see: https://stackoverflow.com/a/61101531
	format!("{:.1$}", val, fraction_digits)
}
pub fn f64_to_percent_str(f: f64, fraction_digits: usize) -> String {
	let val_as_percent = f * 100.0;
	format!("{}%", f64_to_str_rounded(val_as_percent, fraction_digits))
}

pub fn match_cond_to_iter<T>(cond_x: bool, iter_y: impl Iterator<Item = T> + 'static, iter_z: impl Iterator<Item = T> + 'static) -> Box<dyn Iterator<Item = T>> {
	match cond_x {
		true => Box::new(iter_y),
		false => Box::new(iter_z),
	}
}

/*macro_rules! default(
	// Create a new T where T is known.
	// let x = default!(Foo, x:1);
	($T:ident, $($k:ident: $v:expr), *) => (
		$T { $($k: $v), *, ..::std::default::Default::default() }
	);

	// Create a new T where T is known, but with defaults.
	// let x = default!(Foo);
	($T:ident) => (
		$T { ..::std::default::Default::default() }
	);

	// Create a new T where T is not known.
	// let x: T = default!();
	() => (
		::std::default::Default::default();
	);
);*/

/// Alternative to `my_hash_map.entry(key).or_insert_with(...)`, for when the hashmap is wrapped in a RwLock, and you want a "write" lock to only be obtained if a "read" lock is insufficient. (see: https://stackoverflow.com/a/57057033)
/// Returns tuple of:
/// * 0: The value that was found/created.
/// * 1: `true` if the entry didn't exist and had to be created -- `false` otherwise.
/// * 2: The new number of entries in the map.
pub async fn rw_locked_hashmap__get_entry_or_insert_with<K: std::fmt::Debug, V: Clone>(map: &RwLock<HashMap<K, V>>, key: K, insert_func: impl FnOnce() -> V) -> (V, bool, usize)
where
	K: Sized,
	K: Hash + Eq,
{
	//new_mtx!(mtx, "1", mtx_p);
	{
		let map_read = map.read().await;
		//mtx.section("1.1");
		//println!("1.1, key:{:?}", key);
		if let Some(val) = map_read.get(&key) {
			let val_clone = val.clone();
			let count = map_read.len();
			return (val_clone, false, count);
		}
	}

	//mtx.section("2");
	let mut map_write = map.write().await;
	//mtx.section("2.1");
	//println!("2.1, key:{:?}", key);
	// use entry().or_insert_with() in case another thread inserted the same key while we were unlocked above
	let val_clone = map_write.entry(key).or_insert_with(insert_func).clone();
	let count = map_write.len();
	(val_clone, true, count)
}

/*pub fn flurry_hashmap_into_hashmap<K: Hash + Eq + Clone, V: Clone>(map: &flurry::HashMap<K, V>, guard: Guard<'_>) -> HashMap<K, V> {
	let mut result = HashMap::new();
	for (key, value) in map.iter(&guard) {
		result.insert(key.clone(), value.clone());
	}
	result
}
pub fn flurry_hashmap_into_json_map<K: Hash + Ord + Eq + Clone + Display, V: Serialize>(map: &flurry::HashMap<K, V>, guard: Guard<'_>, sort: bool) -> Result<Map<String, JSONValue>, serde_json::Error> {
	let mut result = Map::new();
	if sort {
		for (key, value) in map.iter(&guard).sorted_by_key(|a| a.0) {
			result.insert(key.to_string(), serde_json::to_value(value)?);
		}
	} else {
		for (key, value) in map.iter(&guard) {
			result.insert(key.to_string(), serde_json::to_value(value)?);
		}
	}
	Ok(result)
}*/

pub struct AtomicF64 {
	storage: AtomicU64,
}
impl AtomicF64 {
	pub fn new(value: f64) -> Self {
		let as_u64 = value.to_bits();
		Self { storage: AtomicU64::new(as_u64) }
	}
	pub fn store(&self, value: f64, ordering: Ordering) {
		let as_u64 = value.to_bits();
		self.storage.store(as_u64, ordering)
	}
	pub fn load(&self, ordering: Ordering) -> f64 {
		let as_u64 = self.storage.load(ordering);
		f64::from_bits(as_u64)
	}
}
