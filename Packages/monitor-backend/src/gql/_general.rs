use anyhow::{anyhow, Context, Error};
use async_graphql::{Object, Result, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject};
use flume::{Receiver, Sender};
use futures::executor::block_on;
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future};
use hyper::{Body, Method};
use rust_macros::wrap_slow_macros;
use rust_shared::SubError;
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio_postgres::{Client};
use tracing::{error, info};
use std::{env, fs};
use std::path::Path;
use std::str::FromStr;
use std::{time::Duration, pin::Pin, task::Poll};
use hyper_tls::HttpsConnector;

use crate::links::app_server_rs_types::{MtxData, LogEntry};
use crate::utils::futures::make_reliable;
use crate::{GeneralMessage};
use crate::migrations::v2::migrate_db_to_v2;
use crate::store::storage::{AppStateWrapper};
use crate::utils::general::body_to_str;
use crate::utils::type_aliases::{JSONValue, ABSender, ABReceiver};

pub fn admin_key_is_correct(admin_key: String, print_message_if_wrong: bool) -> bool {
    let result = admin_key == env::var("MONITOR_BACKEND_ADMIN_KEY").unwrap();
    if !result && print_message_if_wrong {
        error!("Admin-key is incorrect! Submitted:{}", admin_key);
    }
    return result;
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
    
    async fn mtxResults(&self, ctx: &async_graphql::Context<'_>, admin_key: String, start_time: f64, end_time: f64) -> Result<Vec<MtxData>, Error> {
        if !admin_key_is_correct(admin_key, true) { return Err(anyhow!("Admin-key is incorrect!")); }
        
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
    
    async fn basicInfo(&self, _ctx: &async_graphql::Context<'_>, admin_key: String) -> Result<JSONValue, Error> {
        if !admin_key_is_correct(admin_key, true) { return Err(anyhow!("Admin-key is incorrect!")); }
        
        let basic_info = get_basic_info_from_app_server_rs().await?;
        Ok(basic_info)
    }
}

pub async fn get_basic_info_from_app_server_rs() -> Result<JSONValue, Error> {
    let client = hyper::Client::new();
    let req = hyper::Request::builder()
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

pub async fn get_k8s_pod_names(namespace: &str) -> Result<Vec<String>, Error> {
    let token = fs::read_to_string("/var/run/secrets/kubernetes.io/serviceaccount/token")?;
    let k8s_host = env::var("KUBERNETES_SERVICE_HOST")?;
    let k8s_port = env::var("KUBERNETES_PORT_443_TCP_PORT")?;

    let req = hyper::Request::builder()
        .method(Method::GET)
        .uri(format!("https://{k8s_host}:{k8s_port}/api/v1/namespaces/{namespace}/pods/"))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {token}"))
        .body(json!({}).to_string().into())?;
    /*let client = hyper::Client::new();
    let res = client.request(req).await?;*/
    let https = HttpsConnector::new();
    let res = hyper::Client::builder().build::<_, hyper::Body>(https).request(req).await?;

    let res_as_json_str = body_to_str(res.into_body()).await?;
    info!("Got list of k8s pods (in namespace \"{namespace}\"): {}", res_as_json_str);
    let res_as_json = JSONValue::from_str(&res_as_json_str)?;

    let pod_names = (|| {
        let mut pod_names: Vec<String> = vec![];
        for pod_info in res_as_json.as_object()?.get("items")?.as_array()? {
            let pod_name = pod_info.as_object()?.get("metadata")?.as_object()?.get("name")?.as_str()?;
            pod_names.push(pod_name.to_owned());
        }
        Some(pod_names)
    })().ok_or_else(|| anyhow!("Response from kubernetes API is malformed:{res_as_json_str}"))?;

    Ok(pod_names)
}

pub async fn tell_k8s_to_restart_app_server() -> Result<JSONValue, Error> {
    info!("Beginning request to restart the app-server.");
    let token = fs::read_to_string("/var/run/secrets/kubernetes.io/serviceaccount/token")?;
    let k8s_host = env::var("KUBERNETES_SERVICE_HOST")?;
    let k8s_port = env::var("KUBERNETES_PORT_443_TCP_PORT")?;

    // todo: improve this to ignore pods that are already terminating (eg. for if trying to restart app-server right shortly after a previous restart)
    let app_server_pod_name: String = get_k8s_pod_names("default").await?
        .iter().find(|a| a.starts_with("dm-app-server-rs-")).ok_or(anyhow!("App-server pod not found in list of active pods."))?.to_owned();

    let req = hyper::Request::builder()
        .method(Method::DELETE)
        .uri(format!("https://{k8s_host}:{k8s_port}/api/v1/namespaces/default/pods/{app_server_pod_name}"))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {token}"))
        .body(json!({}).to_string().into())?;
    /*let client = hyper::Client::new();
    let res = client.request(req).await?;*/
    let https = HttpsConnector::new();
    let res = hyper::Client::builder().build::<_, hyper::Body>(https).request(req).await?;
    
    let res_as_json_str = body_to_str(res.into_body()).await?;
    info!("Got response from k8s server, on trying to restart pod \"{app_server_pod_name}\": {}", res_as_json_str);
    let res_as_json = JSONValue::from_str(&res_as_json_str)?;

    Ok(res_as_json)
}

// mutations
// ==========

#[derive(SimpleObject)]
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
    /*async fn clearLogEntries(&self, ctx: &async_graphql::Context<'_>, admin_key: String) -> Result<GenericMutation_Result, Error> {
        if !admin_key_is_correct(admin_key, true) { return Err(anyhow!("Admin-key is incorrect!")); }
        
        let app_state = ctx.data::<AppStateWrapper>().unwrap();
        let mut mtx_results = app_state.mtx_results.write().await;
        mtx_results.clear();
        
        Ok(GenericMutation_Result {
            message: "success".to_string(),
        })
    }*/
    
    async fn restartAppServer(&self, _ctx: &async_graphql::Context<'_>, admin_key: String) -> Result<GenericMutation_Result, Error> {
        if !admin_key_is_correct(admin_key, true) { return Err(anyhow!("Admin-key is incorrect!")); }
        
        tell_k8s_to_restart_app_server().await?;
        
        Ok(GenericMutation_Result {
            message: "success".to_string(),
        })
    }

    async fn clearMtxResults(&self, ctx: &async_graphql::Context<'_>, admin_key: String) -> Result<GenericMutation_Result, Error> {
        if !admin_key_is_correct(admin_key, true) { return Err(anyhow!("Admin-key is incorrect!")); }
        
        let app_state = ctx.data::<AppStateWrapper>().unwrap();
        let mut mtx_results = app_state.mtx_results.write().await;
        mtx_results.clear();
        
        Ok(GenericMutation_Result {
            message: "success".to_string(),
        })
    }
    
    async fn startMigration(&self, ctx: &async_graphql::Context<'_>, admin_key: String, to_version: usize) -> Result<StartMigration_Result, Error> {
        if !admin_key_is_correct(admin_key, true) { return Err(anyhow!("Admin-key is incorrect!")); }
        
        let msg_sender = ctx.data::<Sender<GeneralMessage>>().unwrap();
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
}

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
                        GeneralMessage::MigrateLogMessageAdded(text) => {
                            yield Ok(MigrationLogEntry { text });
                        },
                        GeneralMessage::LogEntryAdded(_entry) => {},
                    }
                }
            }
        };
        base_stream
    }
}

}