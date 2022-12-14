use rust_shared::itertools::Itertools;
use rust_shared::anyhow::{anyhow, Context, Error};
use rust_shared::async_graphql::{Object, Result, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject, self};
use flume::{Receiver, Sender};
use rust_shared::utils::_k8s::get_reqwest_client_with_k8s_certs;
use rust_shared::utils::futures::make_reliable;
use rust_shared::{futures, axum, tower, tower_http, GQLError};
use futures::executor::block_on;
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future};
use rust_shared::hyper::{Body, Method};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::SubError;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Client};
use rust_shared::serde;
use tracing::{error, info};
use std::fs::File;
use std::io::Read;
use std::{env, fs};
use std::path::Path;
use std::str::FromStr;
use std::{time::Duration, pin::Pin, task::Poll};

use crate::links::app_server_rs_types::{MtxData, LogEntry};
use crate::testing::general::{execute_test_sequence, TestSequence};
use crate::{GeneralMessage};
use crate::migrations::v2::migrate_db_to_v2;
use crate::store::storage::{AppStateWrapper, LQInstance_Partial};
use crate::utils::general::body_to_str;
use crate::utils::type_aliases::{JSONValue, ABSender, ABReceiver};

pub fn admin_key_is_correct(admin_key: String, print_message_if_wrong: bool) -> bool {
    let result = admin_key == env::var("MONITOR_BACKEND_ADMIN_KEY").unwrap();
    if !result && print_message_if_wrong {
        error!("Admin-key is incorrect! Submitted:{}", admin_key);
    }
    return result;
}
pub fn ensure_admin_key_is_correct(admin_key: String, print_message_if_wrong: bool) -> Result<(), Error> {
    if !admin_key_is_correct(admin_key, print_message_if_wrong) {
        return Err(anyhow!("Admin-key is incorrect!"));
    }
    Ok(())
}

wrap_slow_macros!{

// queries
// ==========

#[derive(Default)]
pub struct QueryShard_General;
#[Object]
impl QueryShard_General {
    /// async-graphql requires there to be at least one entry under the Query section
    async fn empty(&self) -> &str { "" }
    
    async fn mtxResults(&self, ctx: &async_graphql::Context<'_>, admin_key: String, start_time: f64, end_time: f64) -> Result<Vec<MtxData>, GQLError> {
        ensure_admin_key_is_correct(admin_key, true)?;
        
        let app_state = ctx.data::<AppStateWrapper>().unwrap();
        let mtx_results = app_state.mtx_results.read().await.to_vec();
        let mtx_results_filtered: Vec<MtxData> = mtx_results.into_iter().filter(|mtx| {
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
        }).collect();
        Ok(mtx_results_filtered)
    }
    
    async fn lqInstances(&self, ctx: &async_graphql::Context<'_>, admin_key: String) -> Result<Vec<LQInstance_Partial>, GQLError> {
        ensure_admin_key_is_correct(admin_key, true)?;
        
        let app_state = ctx.data::<AppStateWrapper>().unwrap();
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
        
        let basic_info = get_basic_info_from_app_server_rs().await?;
        Ok(basic_info)
    }
}

pub async fn get_basic_info_from_app_server_rs() -> Result<JSONValue, Error> {
    let client = rust_shared::hyper::Client::new();
    let req = rust_shared::hyper::Request::builder()
        .method(Method::GET)
        .uri("http://dm-app-server-rs.default.svc.cluster.local:5110/basic-info")
        .header("Content-Type", "application/json")
        .body(json!({}).to_string().into())?;
    let res = client.request(req).await?;
    let res_as_json_str = body_to_str(res.into_body()).await?;
    let res_as_json = JSONValue::from_str(&res_as_json_str)?;
    //println!("Done! Response:{}", res_as_json);

    Ok(res_as_json)
}

#[derive(Debug)]
pub struct K8sPodBasicInfo {
    pub name: String,
    //pub creation_time: i64,
    pub creation_time_str: String,
}
pub async fn get_k8s_pod_basic_infos(namespace: &str, filter_to_running_pods: bool) -> Result<Vec<K8sPodBasicInfo>, Error> {
    let token = fs::read_to_string("/var/run/secrets/kubernetes.io/serviceaccount/token")?;
    let k8s_host = env::var("KUBERNETES_SERVICE_HOST")?;
    let k8s_port = env::var("KUBERNETES_PORT_443_TCP_PORT")?;

    let client = get_reqwest_client_with_k8s_certs()?;
    let pod_filters_str = if filter_to_running_pods { "?fieldSelector=status.phase=Running" } else { "" };
    let req = client.get(format!("https://{k8s_host}:{k8s_port}/api/v1/namespaces/{namespace}/pods{pod_filters_str}"))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {token}"))
        .body(json!({}).to_string()).build()?;
    let res = client.execute(req).await?;

    let res_as_json_str = res.text().await?;
    //info!("Got list of k8s pods (in namespace \"{namespace}\"): {}", res_as_json_str);
    let res_as_json = JSONValue::from_str(&res_as_json_str)?;

    let pod_infos = (|| {
        let mut pod_infos: Vec<K8sPodBasicInfo> = vec![];
        for pod_info_json in res_as_json.as_object()?.get("items")?.as_array()? {
            let metadata = pod_info_json.as_object()?.get("metadata")?.as_object()?;
            let pod_name = metadata.get("name")?.as_str()?;
            let creation_time_str = metadata.get("creationTimestamp")?.as_str()?;
            //let creation_time = chrono::DateTime::parse_from_rfc3339(creation_time_str)?;
            pod_infos.push({
                K8sPodBasicInfo { name: pod_name.to_owned(), creation_time_str: creation_time_str.to_owned() }
            });
        }
        Some(pod_infos)
    })().ok_or_else(|| anyhow!("Response from kubernetes API is malformed:{res_as_json_str}"))?;

    Ok(pod_infos)
}

pub async fn tell_k8s_to_restart_app_server() -> Result<JSONValue, Error> {
    info!("Beginning request to restart the app-server.");
    let token = fs::read_to_string("/var/run/secrets/kubernetes.io/serviceaccount/token")?;
    let k8s_host = env::var("KUBERNETES_SERVICE_HOST")?;
    let k8s_port = env::var("KUBERNETES_PORT_443_TCP_PORT")?;

    // supply "true", to ignore pods that are already terminating [edit: this doesn't actually work, because terminating pods still show up as "running"; see below for working fix, through use of creation-time field]
    let k8s_pods = get_k8s_pod_basic_infos("default", true).await?;
    info!("Got k8s_pods: {:?}", k8s_pods);
    let app_server_pod_info = k8s_pods.iter().filter(|a| a.name.starts_with("dm-app-server-rs-"))
        .sorted_by_key(|a| &a.creation_time_str).last() // sort by creation-time, then find last (this way we kill the most recent, if multiple pod matches exist)
        .ok_or(anyhow!("App-server pod not found in list of active pods."))?.to_owned();

    let client = get_reqwest_client_with_k8s_certs()?;
    let req = client.delete(format!("https://{k8s_host}:{k8s_port}/api/v1/namespaces/default/pods/{}", app_server_pod_info.name))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {token}"))
        .body(json!({}).to_string()).build()?;
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

#[derive(Default)] pub struct MutationShard_General;
#[Object] impl MutationShard_General {
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
        
        Ok(GenericMutation_Result {
            message: "success".to_string(),
        })
    }

    async fn clearMtxResults(&self, ctx: &async_graphql::Context<'_>, admin_key: String) -> Result<GenericMutation_Result, GQLError> {
        ensure_admin_key_is_correct(admin_key, true)?;
        
        let app_state = ctx.data::<AppStateWrapper>().unwrap();
        let mut mtx_results = app_state.mtx_results.write().await;
        mtx_results.clear();
        
        Ok(GenericMutation_Result {
            message: "success".to_string(),
        })
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
        
        Ok(StartMigration_Result {
            migrationID: migration_id,
        })
    }

    async fn executeTestSequence(&self, ctx: &async_graphql::Context<'_>, admin_key: String, sequence: TestSequence) -> Result<GenericMutation_Result, GQLError> {
        ensure_admin_key_is_correct(admin_key.clone(), true)?;
        
        //let message = execute_test_sequence_on_app_server_rs(admin_key, sequence).await?;

        let msg_sender = ctx.data::<ABSender<GeneralMessage>>().unwrap();
        execute_test_sequence(sequence, msg_sender.clone()).await?;
        /*if let Err(ref err) = migration_result {
            error!("Got error while running migration:{}", err);
        }*/

        Ok(GenericMutation_Result {
            message: "success".to_owned(),
        })
    }
}

/*#[derive(Serialize)]
pub struct ExecuteTestSequence_Vars {
   adminKey: String,
   sequence: JSONValue,
}

pub async fn execute_test_sequence_on_app_server_rs(admin_key: String, sequence: JSONValue) -> Result<String, Error> {
    let endpoint = "http://dm-app-server-rs.default.svc.cluster.local:5110/graphql";
    let query = r#"
        mutation($adminKey: String!, $sequence: JSON!) {
            executeTestSequence(adminKey: $adminKey, sequence: $sequence) {
                message
            }
        }
    "#;

    let client = gql_client::Client::new(endpoint);
    let vars = ExecuteTestSequence_Vars { adminKey: admin_key, sequence };
    let data_opt = client.query_with_vars::<GenericMutation_Result, ExecuteTestSequence_Vars>(query, vars).await
        .map_err(|a| anyhow!("GraphQL error:{}", a.message()))?; // todo: probably have this include all the error information
    let data = data_opt.ok_or(anyhow!("Data was none/empty."))?;

    //println!("Id: {}, Name: {}", data.user.id, data.user.name);

    Ok(data.message)
}*/

// subscriptions
// ==========

#[derive(Default)]
pub struct SubscriptionShard_General;

#[derive(SimpleObject)]
struct Ping_Result {
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
//#[derive(Clone, SimpleObject)] pub struct GQLSet_LogEntry { nodes: Vec<LogEntry> }

#[Subscription]
impl SubscriptionShard_General {
    #[graphql(name = "_Ping")]
    async fn _Ping(&self, _ctx: &async_graphql::Context<'_>) -> impl Stream<Item = Ping_Result> {
        let pong = "pong".to_owned();
        // create the listed file in the app-server-rs pod (eg. using Lens), if you've made an update that you need all clients to refresh for
        let refreshPage = Path::new("./refreshPageForAllUsers_enabled").exists();
        
        stream::once(async move { Ping_Result {
            pong,
            refreshPage,
        } })
    }

    async fn logEntries<'a>(&self, ctx: &'a async_graphql::Context<'_>, admin_key: String) -> impl Stream<Item = Result<Vec<LogEntry>, SubError>> + 'a {        
        //let msg_receiver = ctx.data::<Receiver<GeneralMessage_Flume>>().unwrap();

        let msg_sender = ctx.data::<ABSender<GeneralMessage>>().unwrap();
        //let mut msg_receiver = msg_sender.subscribe();
        //let mut temp = msg_sender.subscribe().peekable();
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
        //let mut msg_receiver = msg_sender.subscribe();
        let mut msg_receiver = msg_sender.new_receiver();
        
        //let mut msg_receiver = ctx.data::<PBReceiver<GeneralMessage>>().unwrap().clone();

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