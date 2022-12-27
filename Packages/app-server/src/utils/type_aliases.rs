use deadpool::managed::Object;
use deadpool_postgres::Manager;
use rust_shared::{serde_json::Map, utils::type_aliases::JSONValue};

// sync with type_aliases.rs in monitor-backend
// ==========

//pub type GQLContext<'a> = async_graphql::Context<'a>; // couldn't get this working right, with #[Subscription] macro
//pub type JSONValue = serde_json::Value;
pub type PGClientObject = Object<Manager>;
pub type RowData = Map<String, JSONValue>;

// channels
pub type FSender<T> = flume::Sender<T>;
pub type FReceiver<T> = flume::Receiver<T>;
pub type ABSender<T> = async_broadcast::Sender<T>;
pub type ABReceiver<T> = async_broadcast::Receiver<T>;