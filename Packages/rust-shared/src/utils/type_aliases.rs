use serde_json::Map;

pub type JSONValue = serde_json::Value;
pub type RowData = Map<String, JSONValue>;

pub type JWTDuration = jwt_simple::prelude::Duration;

// channels
pub type FSender<T> = flume::Sender<T>;
pub type FReceiver<T> = flume::Receiver<T>;
