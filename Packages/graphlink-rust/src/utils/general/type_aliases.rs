use core::ops::{Deref, DerefMut};
use std::sync::Arc;

use deadpool::managed::Object;
use deadpool_postgres::Manager;
use serde::{Deserialize, Serialize};
use serde_json::Map;

pub type JSONValue = serde_json::Value;
pub type JSONMap = serde_json::Map<String, JSONValue>;
/*pub type EntryBlob = Map<String, JSONValue>;
pub type EntryJSON = Map<String, JSONValue>;*/

pub type JWTDuration = jwt_simple::prelude::Duration;

// channels
pub type FSender<T> = flume::Sender<T>;
pub type FReceiver<T> = flume::Receiver<T>;
pub type TBSender<T> = tokio::sync::broadcast::Sender<T>;
pub type TBReceiver<T> = tokio::sync::broadcast::Receiver<T>;

// sync with type_aliases.rs in monitor-backend
// ==========

//pub type GQLContext<'a> = async_graphql::Context<'a>; // couldn't get this working right, with #[Subscription] macro
//pub type JSONValue = serde_json::Value;
pub type DBPool = deadpool_postgres::Pool;
pub type DBPoolArc = Arc<DBPool>;
pub type PGClientObject = Object<Manager>;

// channels
/*pub type ABSender<T> = async_broadcast::Sender<T>;
pub type ABReceiver<T> = async_broadcast::Receiver<T>;*/
