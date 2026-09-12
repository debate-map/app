use crate::{APActionDef, EntryBlob, EntryJSON, JSONValue, TableDef, ToOwnedV};
use anyhow::{bail, Error};
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};

#[derive(PartialEq, Eq)]
pub enum ServerPod {
	WebServer,
	AppServer,
	Monitor,
	Grafana,
	Pyroscope,
}
pub struct GetServerURL_Options {
	pub claimed_client_url: Option<String>,
	pub restrict_to_recognized_hosts: bool,

	pub force_localhost: bool,
	pub force_https: bool,
}
type GetServerURLFn = fn(ServerPod, &str, GetServerURL_Options) -> Result<String, Error>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MonitorEvent {
	//LogEntryAdded { entry: LogEntry },
	//MtxEntryDone { mtx: MtxData },
	LQInstanceUpdated {
		//key: String,
		// we don't want to place LQKey struct in rust-shared, so pass generic string and JSONValue instead
		table_name: String,
		filter: JSONValue,

		last_entries: Vec<EntryBlob>,
		watchers_count: u32,
		deleting: bool,
	},
}
type OnMonitorEventFn = fn(MonitorEvent);

#[derive(Debug)]
pub struct Config {
	pub env_is_prod: bool,
	pub route_prefix: String,
	pub table_defs: Vec<TableDef>,
	pub ap_action_defs: Vec<APActionDef>,
	pub on_monitor_event: OnMonitorEventFn,

	pub get_server_url: GetServerURLFn,
	pub system_user_id: String,
	pub system_user_email: String,
}
impl Config {
	pub fn table_def(&self, table_name: &str) -> Result<&TableDef, Error> {
		self.table_defs.iter().find(|table_def| table_def.name == table_name).ok_or_else(|| anyhow::anyhow!("Table-definition not found for table: {}", table_name))
	}

	pub fn validate(&self) -> Result<(), Error> {
		for table_def in &self.table_defs {
			for column_def in &table_def.columns {
				if column_def.default_value.is_some() {
					bail!("Table-def {} has columns with a default-value provided; this is not supported at the moment.", table_def.name);
				}
			}
		}
		Ok(())
	}
}

static CONFIG: OnceCell<Config> = OnceCell::new();

// Step 3: Provide an initialization function
pub fn initialize_config(config: Config) {
	config.validate().expect("Config validation failed");
	CONFIG.set(config).expect("Config can only be initialized once");
}

pub fn cf() -> &'static Config {
	CONFIG.get().expect("Config is not initialized")
}

pub fn route_path(path: &str) -> String {
	let prefix = cf().route_prefix.as_str();
	assert!(path.starts_with("/"));
	format!("{}{}", prefix, path)
}
