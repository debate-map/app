use anyhow::{anyhow, Context, Error};
use async_graphql::{Object, Result, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject};
use flume::{Receiver, Sender};
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future};
use hyper::{Body, Method};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio_postgres::{Client};
use std::env;
use std::path::Path;
use std::{time::Duration, pin::Pin, task::Poll};

use crate::GeneralMessage;
use crate::migrations::v2::migrate_db_to_v2;

pub fn admin_key_is_correct(admin_key: String, print_message_if_wrong: bool) -> bool {
    let result = admin_key == env::var("MONITOR_BACKEND_ADMIN_KEY").unwrap();
    if !result && print_message_if_wrong {
        println!("Admin-key is incorrect! Submitted:{}", admin_key);
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
}

// mutations
// ==========

#[derive(SimpleObject)]
struct StartMigration_Result {
    #[graphql(name = "migrationID")]
    migrationID: String,
}

#[derive(Default)]
pub struct MutationShard_General;
#[Object]
impl MutationShard_General {
    async fn startMigration(&self, ctx: &async_graphql::Context<'_>, admin_key: String, to_version: usize) -> Result<StartMigration_Result, Error> {
        if !admin_key_is_correct(admin_key, true) { return Err(anyhow!("Admin-key is incorrect!")); }
        
        let msg_sender = ctx.data::<Sender<GeneralMessage>>().unwrap();
        let migration_result = match to_version {
            2 => migrate_db_to_v2(msg_sender.clone()).await,
            _ => Err(anyhow!("No migration-code exists for migrating to version {to_version}!")),
        };
        if let Err(ref err) = migration_result {
            println!("Got error while running migration:{}", err);
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
pub struct LogEntry {
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
    async fn migrateLogEntries<'a>(&self, ctx: &'a async_graphql::Context<'_>) -> impl Stream<Item = LogEntry> + 'a {
        let msg_receiver = ctx.data::<Receiver<GeneralMessage>>().unwrap();
        
        //let nodes: Vec<LogEntry> = vec![];
        let base_stream = async_stream::stream! {
            yield LogEntry { text: "Stream started...".to_owned() };
            loop {
                let next_msg = msg_receiver.recv_async().await.unwrap();
                match next_msg {
                    GeneralMessage::MigrateLogMessageAdded(text) => {
                        yield LogEntry { text };
                    }
                }
            }
        };
        base_stream
    }
}

}