pub use graphlink_rust::utils::general::type_aliases::*; // the other aliases are the crate's
use serde_json::Map;

pub type RowData = Map<String, JSONValue>;
