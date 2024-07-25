use futures::executor::block_on;
use futures_util::{stream, Future, Stream, StreamExt, TryFutureExt};
use rust_shared::anyhow::{anyhow, bail, ensure, Context, Error};
use rust_shared::async_graphql::{self, async_stream, scalar, EmptySubscription, Enum, InputObject, Object, OutputType, Result, Schema, SimpleObject, Subscription, ID};
use rust_shared::flume::{Receiver, Sender};
use rust_shared::hyper::{Method, Request};
use rust_shared::itertools::Itertools;
use rust_shared::links::app_server_to_monitor_backend::LogEntry;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::Client;
use rust_shared::utils::_k8s::{exec_command_in_another_pod, get_k8s_pod_basic_infos, get_or_create_k8s_secret, try_get_k8s_secret};
use rust_shared::utils::futures::make_reliable;
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::k8s::cert_handling::get_reqwest_client_with_k8s_certs;
use rust_shared::utils::mtx::mtx::{MtxData, MtxDataForAGQL};
use rust_shared::utils::net::{body_to_str, new_hyper_client_http};
use rust_shared::utils::time::time_since_epoch_ms_i64;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::SubError;
use rust_shared::{axum, base64, futures, reqwest, tower, tower_http, GQLError};
use std::fs::File;
use std::io::Read;
use std::path::Path;
use std::str::FromStr;
use std::{env, fs, vec};
use std::{pin::Pin, task::Poll, time::Duration};
use tracing::{error, info};

use crate::migrations::v2::migrate_db_to_v2;
use crate::store::storage::{AppStateArc, LQInstance_Partial};
use crate::testing::general::{execute_test_sequence, TestSequence};
use crate::utils::type_aliases::{ABReceiver, ABSender};
use crate::GeneralMessage;

pub fn admin_key_is_correct(admin_key: String, log_message_if_wrong: bool) -> bool {
	let result = admin_key == env::var("MONITOR_BACKEND_ADMIN_KEY").unwrap();
	if !result && log_message_if_wrong {
		error!("Admin-key is incorrect! Submitted:{}", admin_key);
	}
	return result;
}
pub fn ensure_admin_key_is_correct(admin_key: String, log_message_if_wrong: bool) -> Result<(), Error> {
	if !admin_key_is_correct(admin_key, log_message_if_wrong) {
		return Err(anyhow!("Admin-key is incorrect!"));
	}
	Ok(())
}

wrap_slow_macros! {

// queries
// ==========

#[derive(SimpleObject, Debug)]
struct DfRecord {
	filesystem: String,
	blocks_1k: u64,
	used: u64,
	available: u64,
	use_percent: u8,
	mounted_on: String,
}

impl FromStr for DfRecord {
	type Err = &'static str;

	fn from_str(line: &str) -> Result<Self, Self::Err> {
		let parts: Vec<&str> = line.split_whitespace().collect();
		if parts.len() != 6 {
			return Err("Line does not have 6 parts");
		}

		let filesystem = parts[0].to_string();
		let blocks_1k = parts[1].parse().map_err(|_| "Failed to parse blocks_1k")?;
		let used = parts[2].parse().map_err(|_| "Failed to parse used")?;
		let available = parts[3].parse().map_err(|_| "Failed to parse available")?;
		let use_percent_str = parts[4].trim_end_matches('%');
		let use_percent = use_percent_str.parse().map_err(|_| "Failed to parse use_percent")?;
		let mounted_on = parts[5].to_string();

		Ok(DfRecord { filesystem, blocks_1k, used, available, use_percent, mounted_on })
	}
}

#[derive(Default)]
pub struct QueryShard_General;
#[Object]
impl QueryShard_General {
	/// async-graphql requires there to be at least one entry under the Query section
	async fn empty(&self) -> &str {
		""
	}

	async fn mtxResults(&self, ctx: &async_graphql::Context<'_>, admin_key: String, start_time: f64, end_time: f64) -> Result<Vec<MtxDataForAGQL>, GQLError> {
		ensure_admin_key_is_correct(admin_key, true)?;

		let app_state = ctx.data::<AppStateArc>().unwrap();
		let mtx_results = app_state.mtx_results.read().await.to_vec();
		let mtx_results_filtered = mtx_results
			.into_iter()
			.filter(|mtx| {
				for lifetime in mtx.section_lifetimes.values() {
					let section_start = lifetime.start_time;
					let section_end = match lifetime.duration {
						Some(duration) => section_start + duration,
						None => f64::MAX, // for this context of filtering, consider a not-yet-ended section to extend to max-time
					};
					if section_start < end_time && section_end > start_time {
						return true;
					}
				}
				false
			})
			.collect_vec();
		let mtx_results_filtered_transformed = mtx_results_filtered.into_iter().map(|mtx| MtxDataForAGQL::from_base(&mtx)).collect_vec();
		Ok(mtx_results_filtered_transformed)
	}

	async fn lqInstances(&self, ctx: &async_graphql::Context<'_>, admin_key: String) -> Result<Vec<LQInstance_Partial>, GQLError> {
		ensure_admin_key_is_correct(admin_key, true)?;

		let app_state = ctx.data::<AppStateArc>().unwrap();
		let lqis: Vec<LQInstance_Partial> = app_state.lqi_data.read().await.values().map(|a| a.clone()).collect();
		/*let lqis_filtered: Vec<LQInstance_Partial> = lqis.into_iter().filter(|mtx| {
			for lifetime in mtx.section_lifetimes.values() {
				let section_start = lifetime.start_time;
				let section_end = match lifetime.duration {
					Some(duration) => section_start + duration,
					None => f64::MAX, // for this context of filtering, consider a not-yet-ended section to extend to max-time
				};
				if section_start < end_time && section_end > start_time {
					return true;
				}
			}
			false
		}).collect();*/
		Ok(lqis)
	}

	async fn basicInfo(&self, _ctx: &async_graphql::Context<'_>, admin_key: String) -> Result<JSONValue, GQLError> {
		ensure_admin_key_is_correct(admin_key, true)?;

		let basic_info = get_basic_info_from_app_server().await?;
		Ok(basic_info)
	}

	async fn getGrafanaPassword(&self, _ctx: &async_graphql::Context<'_>, admin_key: String) -> Result<String, GQLError> {
		ensure_admin_key_is_correct(admin_key, true)?;

		/*match try_get_k8s_secret("loki-stack-grafana".o(), "monitoring").await? {
			Some(secret) => {
				let password = secret.data.get("admin-password").ok_or(anyhow!("Field \"admin-password\" missing!"))?.as_str().ok_or(anyhow!("Field \"admin-password\" not a string!"))?;
				Ok(password.to_owned())
			},
			None => Err(anyhow!("Could not find the \"loki-stack-grafana\" secret in kubernetes."))?,
		}*/
		let secret = get_or_create_k8s_secret("loki-stack-grafana".o(), "monitoring", None).await?;
		let password_encoded = secret.data.get("admin-password").ok_or(anyhow!("Field \"admin-password\" missing!"))?.as_str().ok_or(anyhow!("Field \"admin-password\" not a string!"))?;
		let password_bytes = base64::decode(password_encoded)?;
		//let password_bytes = base64::decode_config(password_encoded, URL_SAFE_NO_PAD)?;
		let password = String::from_utf8(password_bytes)?;
		Ok(password.to_owned())
	}

	async fn queryLoki(&self, _ctx: &async_graphql::Context<'_>, input: QueryLokiInput) -> Result<QueryLokiResult, GQLError> {
		let QueryLokiInput { adminKey, query, startTime, endTime, limit } = input;
		ensure_admin_key_is_correct(adminKey, true)?;

		let endTime = endTime.unwrap_or((time_since_epoch_ms_i64() + 10000) * 1_000_000); // add 10s, in case of clock drift
		let limit = limit.unwrap_or(10000);

		let log_entries = query_loki(query, startTime, endTime, limit).await?;
		Ok(QueryLokiResult { logEntries: log_entries })
	}

	async fn healthStats(&self, _ctx: &async_graphql::Context<'_>, admin_key: String, pod: HealthStatsPod) -> Result<Vec<DfRecord>, GQLError> {
		ensure_admin_key_is_correct(admin_key, true)?;

		let target_pod = match pod {
			HealthStatsPod::pg_instance1 => get_k8s_pod_basic_infos("postgres-operator", true).await.context("Failed to retrieve basic-info of the k8s pods.")?.into_iter().find(|a| a.name.starts_with("debate-map-instance1")).map(|a| a.name).ok_or_else(|| anyhow!("Could not find debate-map-instance1-XXX pod."))?,
			HealthStatsPod::pg_repo_host_0 => "debate-map-repo-host-0".o(),
		};
		let container = match pod {
			HealthStatsPod::pg_instance1 => "database",
			HealthStatsPod::pg_repo_host_0 => "pgbackrest",
		};
		// pass "--block-size=1" to get sizes in bytes (not kibibytes, which is the default)
		let df_output = exec_command_in_another_pod("postgres-operator", &target_pod, Some(container), "df", vec!["--block-size=1".o()], true).await.context(format!("Failed to run df command in pod:{pod:?}"))?;

		let df = df_output.lines().skip(1).filter_map(|line| line.parse().ok()).collect();

		Ok(df)
	}
}

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize, Debug)]
pub enum HealthStatsPod {
	#[graphql(name = "pg_instance1")] pg_instance1,
	#[graphql(name = "pg_repo_host_0")] pg_repo_host_0,
}

#[derive(InputObject, Deserialize)]
pub struct QueryLokiInput {
	adminKey: String,
	query: String,
	startTime: i64,
	endTime: Option<i64>,
	limit: Option<i64>,
}
#[derive(SimpleObject, Debug)]
struct QueryLokiResult {
	logEntries: Vec<JSONValue>,
}

pub async fn query_loki(query: String, startTime: i64, endTime: i64, limit: i64) -> Result<Vec<JSONValue>, Error> {
	let params_str = rust_shared::url::form_urlencoded::Serializer::new(String::new())
		.append_pair("direction", "BACKWARD")
		//.append_pair("direction", "FORWARD") // commented, since makes behavior confusing (seems neither exactly limit-from-start nor limit-from-end)
		.append_pair("query", &query)
		.append_pair("start", &startTime.to_string())
		.append_pair("end", &endTime.to_string())
		.append_pair("limit", &limit.to_string())
		//.append_pair("step", &30.to_string())
		.finish();
	//info!("Querying loki with params-string:{}", params_str);
	let response_as_str =
		//reqwest::get(format!("http://loki-stack.monitoring.svc.cluster.local:3100/loki/api/v1/query_range?{params_str}")).await?
		reqwest::get(format!("http://http-metrics.tcp.loki-stack.monitoring.svc.cluster.local:3100/loki/api/v1/query_range?{params_str}")).await?
		.text().await?;
	let res_as_json = JSONValue::from_str(&response_as_str).with_context(|| format!("Response text:{}", response_as_str))?;
	//println!("Done! Response:{}", res_as_json);

	let result: Result<_, Error> = try {
		let e = || anyhow!("Response json didn't match expected structure. @response_str:{}", response_as_str);
		let results = res_as_json.get("data").ok_or(e())?.get("result").ok_or(e())?.as_array().ok_or(e())?;
		if results.len() > 0 {
			let log_entries = results.get(0).ok_or(e())?.get("values").ok_or(e())?.as_array().ok_or(e())?;
			log_entries.to_owned()
		} else {
			vec![]
		}
	};
	let log_entries = result?;
	Ok(log_entries)
}

pub async fn get_basic_info_from_app_server() -> Result<JSONValue, Error> {
	let client = new_hyper_client_http();
	let req = rust_shared::hyper::Request::builder().method(Method::GET).uri("http://dm-app-server.default.svc.cluster.local:5110/basic-info").header("Content-Type", "application/json").body(json!({}).to_string().into())?;
	let res = client.request(req).await?;
	let res_as_json_str = body_to_str(res.into_body()).await?;
	let res_as_json = JSONValue::from_str(&res_as_json_str)?;
	//println!("Done! Response:{}", res_as_json);

	Ok(res_as_json)
}

pub async fn tell_k8s_to_restart_app_server() -> Result<JSONValue, Error> {
	info!("Beginning request to restart the app-server.");
	let token = fs::read_to_string("/var/run/secrets/kubernetes.io/serviceaccount/token")?;
	let k8s_host = env::var("KUBERNETES_SERVICE_HOST")?;
	let k8s_port = env::var("KUBERNETES_PORT_443_TCP_PORT")?;

	// supply "true", to ignore pods that are already terminating [edit: this doesn't actually work, because terminating pods still show up as "running"; see below for working fix, through use of creation-time field]
	let k8s_pods = get_k8s_pod_basic_infos("default", true).await?;
	info!("Got k8s_pods: {:?}", k8s_pods);
	let app_server_pod_info = k8s_pods
		.iter()
		.filter(|a| a.name.starts_with("dm-app-server-"))
		.sorted_by_key(|a| &a.creation_time_str)
		.last() // sort by creation-time, then find last (this way we kill the most recent, if multiple pod matches exist)
		.ok_or(anyhow!("App-server pod not found in list of active pods."))?
		.to_owned();

	let client = get_reqwest_client_with_k8s_certs()?;
	let req = client.delete(format!("https://{k8s_host}:{k8s_port}/api/v1/namespaces/default/pods/{}", app_server_pod_info.name)).header("Content-Type", "application/json").header("Authorization", format!("Bearer {token}")).body(json!({}).to_string()).build()?;
	let res = client.execute(req).await?;

	let res_as_json_str = res.text().await?;
	//info!("Got response from k8s server, on trying to restart pod \"{app_server_pod_name}\": {}", res_as_json_str);
	let res_as_json = JSONValue::from_str(&res_as_json_str)?;

	Ok(res_as_json)
}

// mutations
// ==========

#[derive(SimpleObject, Deserialize)]
struct GenericMutation_Result {
	message: String,
}

#[derive(SimpleObject)]
struct StartMigration_Result {
	#[graphql(name = "migrationID")]
	migrationID: String,
}

#[derive(Default)]
pub struct MutationShard_General;
#[Object]
impl MutationShard_General {
	/*async fn clearLogEntries(&self, ctx: &async_graphql::Context<'_>, admin_key: String) -> Result<GenericMutation_Result, GQLError> {
		ensure_admin_key_is_correct(admin_key, true)?;

		let app_state = ctx.data::<AppStateWrapper>().unwrap();
		let mut mtx_results = app_state.mtx_results.write().await;
		mtx_results.clear();

		Ok(GenericMutation_Result {
			message: "success".to_string(),
		})
	}*/

	async fn restartAppServer(&self, _ctx: &async_graphql::Context<'_>, admin_key: String) -> Result<GenericMutation_Result, GQLError> {
		ensure_admin_key_is_correct(admin_key, true)?;

		tell_k8s_to_restart_app_server().await?;

		Ok(GenericMutation_Result { message: "success".to_string() })
	}

	async fn clearMtxResults(&self, ctx: &async_graphql::Context<'_>, admin_key: String) -> Result<GenericMutation_Result, GQLError> {
		ensure_admin_key_is_correct(admin_key, true)?;

		let app_state = ctx.data::<AppStateArc>().unwrap();
		let mut mtx_results = app_state.mtx_results.write().await;
		mtx_results.clear();

		Ok(GenericMutation_Result { message: "success".to_string() })
	}

	async fn startMigration(&self, ctx: &async_graphql::Context<'_>, admin_key: String, to_version: usize) -> Result<StartMigration_Result, GQLError> {
		ensure_admin_key_is_correct(admin_key, true)?;

		let msg_sender = ctx.data::<ABSender<GeneralMessage>>().unwrap();
		let migration_result = match to_version {
			2 => migrate_db_to_v2(msg_sender.clone()).await,
			_ => Err(anyhow!("No migration-code exists for migrating to version {to_version}!")),
		};
		if let Err(ref err) = migration_result {
			error!("Got error while running migration:{}", err);
		}
		let migration_id = migration_result?;

		Ok(StartMigration_Result { migrationID: migration_id })
	}

	async fn executeTestSequence(&self, ctx: &async_graphql::Context<'_>, admin_key: String, sequence: TestSequence) -> Result<GenericMutation_Result, GQLError> {
		ensure_admin_key_is_correct(admin_key.clone(), true)?;

		//let message = execute_test_sequence_on_app_server(admin_key, sequence).await?;

		let msg_sender = ctx.data::<ABSender<GeneralMessage>>().unwrap();
		execute_test_sequence(sequence, msg_sender.clone()).await?;
		/*if let Err(ref err) = migration_result {
			error!("Got error while running migration:{}", err);
		}*/

		Ok(GenericMutation_Result { message: "success".to_owned() })
	}
}

// subscriptions
// ==========

#[derive(SimpleObject)]
struct PingResult {
	pong: String,
	refreshPage: bool,
}
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct MigrationLogEntry {
	pub text: String,
}
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct TestingLogEntry {
	pub text: String,
}
//#[derive(Clone, SimpleObject)] pub struct GQLSet_LogEntry { pub nodes: Vec<LogEntry> }

#[derive(Default)]
pub struct SubscriptionShard_General;
#[Subscription]
impl SubscriptionShard_General {
	#[graphql(name = "_ping")]
	async fn _ping(&self, _ctx: &async_graphql::Context<'_>) -> impl Stream<Item = PingResult> {
		let pong = "pong".to_owned();
		// create the listed file in the app-server pod (eg. using Lens), if you've made an update that you need all clients to refresh for
		let refreshPage = Path::new("./refreshPageForAllUsers_enabled").exists();

		stream::once(async move { PingResult { pong, refreshPage } })
	}

	async fn logEntries<'a>(&self, ctx: &'a async_graphql::Context<'_>, admin_key: String) -> impl Stream<Item = Result<Vec<LogEntry>, SubError>> + 'a {
		let msg_sender = ctx.data::<ABSender<GeneralMessage>>().unwrap();
		let mut msg_receiver = msg_sender.new_receiver();
		// msg_receiver.len() includes entries from before its creation, so set the messages_processed variable appropriately
		let mut messages_processed = msg_receiver.len();

		//let result = tokio::spawn(async move {
		let base_stream = async_stream::stream! {
			if !admin_key_is_correct(admin_key, true) { yield Err(SubError::new(format!("Admin-key is incorrect!"))); return; }

			//yield Ok(LogEntry::default());
			let mut new_entries = vec![]; // use buffer, for more efficient transfer+rerendering
			//let mut entries_sent = 0;
			loop {
				//global_tick_helper().await;

				//let mut msg_receiver = Pin::new(&mut temp);
				//use postage::prelude::Stream;

				/*let next_msg = msg_receiver.recv().unwrap();
				match next_msg {
					GeneralMessage_Flume::LogEntryAdded(entry) => {
						new_entries.push(entry);
					},
				}*/

				//println!("Waiting...");
				//match msg_receiver.recv().await {
				//match msg_receiver.next().await {
				match make_reliable(msg_receiver.recv(), Duration::from_millis(10)).await {
					Err(_err) => break, // channel closed (program must have crashed), end loop
					Ok(msg) => {
						//println!("Msg#:{messages_processed} @msg:{:?}", msg);
						match msg {
							GeneralMessage::MigrateLogMessageAdded(_text) => {},
							GeneralMessage::TestingLogMessageAdded(_text) => {},
							GeneralMessage::LogEntryAdded(entry) => {
								//entries_sent += 1;
								//entry.message = entries_sent.to_string() + "     " + &entry.message;
								new_entries.push(entry);
							},
						}
						messages_processed += 1;
					}
				}

				// if no more messages bufferred up, and we've collected some new log-entries, then send that set of new-entries to the client
				//if msg_receiver.is_empty() && !new_entries.is_empty() {
				let messages_still_buffered = msg_receiver.len().checked_sub(messages_processed).unwrap_or(0);
				//println!("@messages_still_buffered:{messages_still_buffered} @part1:{} @part2:{}", msg_receiver.len(), messages_processed);
				if messages_still_buffered == 0 && !new_entries.is_empty() {
					yield Ok(new_entries);
					new_entries = vec![];
				}
			}
		};
		base_stream
		/*}).await.unwrap();
		result*/
	}

	async fn migrateLogEntries<'a>(&self, ctx: &'a async_graphql::Context<'_>, admin_key: String) -> impl Stream<Item = Result<MigrationLogEntry, SubError>> + 'a {
		let msg_sender = ctx.data::<ABSender<GeneralMessage>>().unwrap();
		let mut msg_receiver = msg_sender.new_receiver();

		let base_stream = async_stream::stream! {
			if !admin_key_is_correct(admin_key, true) { yield Err(SubError::new(format!("Admin-key is incorrect!"))); return; }

			yield Ok(MigrationLogEntry { text: "Stream started...".to_owned() });
			loop {
				//use postage::prelude::Stream;

				//let next_msg = msg_receiver.recv().await.unwrap();
				match msg_receiver.recv().await {
				//match msg_receiver.next().await {
					Err(_err) => break, // channel closed (program must have crashed), end loop
					Ok(msg) => match msg {
						GeneralMessage::LogEntryAdded(_entry) => {},
						GeneralMessage::TestingLogMessageAdded(_text) => {},
						GeneralMessage::MigrateLogMessageAdded(text) => {
							yield Ok(MigrationLogEntry { text });
						},
					}
				}
			}
		};
		base_stream
	}

	async fn testingLogEntries<'a>(&self, ctx: &'a async_graphql::Context<'_>, admin_key: String) -> impl Stream<Item = Result<TestingLogEntry, SubError>> + 'a {
		let msg_sender = ctx.data::<ABSender<GeneralMessage>>().unwrap();
		let mut msg_receiver = msg_sender.new_receiver();

		let base_stream = async_stream::stream! {
			if !admin_key_is_correct(admin_key, true) { yield Err(SubError::new(format!("Admin-key is incorrect!"))); return; }

			yield Ok(TestingLogEntry { text: "Stream started...".to_owned() });
			loop {
				match msg_receiver.recv().await {
					Err(_err) => break, // channel closed (program must have crashed), end loop
					Ok(msg) => match msg {
						GeneralMessage::LogEntryAdded(_entry) => {},
						GeneralMessage::MigrateLogMessageAdded(_text) => {},
						GeneralMessage::TestingLogMessageAdded(text) => {
							yield Ok(TestingLogEntry { text });
						},
					}
				}
			}
		};
		base_stream
	}
}

}
