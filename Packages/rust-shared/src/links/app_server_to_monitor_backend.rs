// section to keep synchronized with "app_server_types.rs" in monitor-backend
// ==========

use async_graphql::SimpleObject;
use rust_macros::wrap_slow_macros;
use serde::{Deserialize, Serialize};

use crate::utils::{
	mtx::mtx::{MtxData, MtxDataWithExtraInfo},
	type_aliases::{JSONValue, RowData},
};

// this alias is needed, since `wrap_serde_macros.rs` inserts refs to, eg. `rust_shared::rust_macros::Serialize_Stub`
use crate as rust_shared;

wrap_slow_macros! {

// This struct is basically only used by logging.rs in app-server, but is placed here, since we also use it in the Message_ASToMB struct.
#[derive(SimpleObject, Clone, Serialize, Deserialize, Debug, Default)]
pub struct LogEntry {
	pub time: f64,
	/// Logging levels: (as interpreted in the debate-map codebase)
	/// * ERROR: Indicates some flaw in the codebase that should be fixed, or an issue in the user/externally supplied data serious enough that the given operation did not proceed.
	/// * WARN: Indicates some unexpected state that *might* be pointing toward an error/thing-to-fix, but could also just be something unusual.
	/// * INFO: Something significant enough that it should show in the process' standard output.
	/// * DEBUG: For low-level information that's fine to stream to the monitor-backend.
	/// * TRACE: For low-level information that's not fine to stream to the monitor-backend. (eg. due to the expected trigger-rate being too high, to where it might congest the local network, or other layer of processing)
	pub level: String,
	pub target: String,
	pub span_name: String,
	pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message_MBToAS {
	//TODO,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message_ASToMB {
	LogEntryAdded { entry: LogEntry },
	MtxEntryDone { mtx: MtxData },
	LQInstanceUpdated {
		//key: String,
		// we don't want to place LQKey struct in rust-shared, so pass generic string and JSONValue instead
		table_name: String,
		filter: JSONValue,

		last_entries: Vec<RowData>,
		watchers_count: u32,
		deleting: bool,
	},
}

}
