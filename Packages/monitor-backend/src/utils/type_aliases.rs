use std::sync::Arc;

use deadpool::managed::Object;
use deadpool_postgres::Manager;
use rust_shared::serde_json::{Map, self};

// sync with type_aliases.rs in app-server
// ==========

//pub type GQLContext<'a> = async_graphql::Context<'a>; // couldn't get this working right, with #[Subscription] macro
pub type DBPool = deadpool_postgres::Pool;
pub type DBPoolArc = Arc<DBPool>;
pub type PGClientObject = Object<Manager>;

// channels
pub type ABSender<T> = async_broadcast::Sender<T>;
pub type ABReceiver<T> = async_broadcast::Receiver<T>;