use anyhow::Error;
use async_graphql::{SimpleObject, InputObject};
use flume::Sender;
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use tracing::{error, info};

use crate::{GeneralMessage, pgclient::create_client, utils::type_aliases::{JSONValue, ABSender}};

wrap_slow_macros!{

#[derive(SimpleObject, InputObject, Debug, Clone, Serialize, Deserialize)]
pub struct TestSequence {
	steps: Vec<TestStep>,
}
#[derive(SimpleObject, InputObject, Debug, Clone, Serialize, Deserialize)]
pub struct TestStep {
	preWait: Option<f64>,
	postWait: Option<f64>,

	addNodeRevision: Option<TS_AddNodeRevision>,
}
#[derive(SimpleObject, InputObject, Debug, Clone, Serialize, Deserialize)]
pub struct TS_AddNodeRevision {
	nodeID: String,
}

}

pub async fn execute_test_sequence(sequence: TestSequence, msg_sender: ABSender<GeneralMessage>) -> Result<(), Error> {
    /*let log = |text: &str| {
        let msg_sender_clone = msg_sender.clone();
        let text_clone = text.clone();
        async move {
            info!("TestingLog: {text_clone}");
            //msg_sender.send(GeneralMessage::TestingLogMessageAdded(text.to_owned())).unwrap();
            match msg_sender_clone.broadcast(GeneralMessage::TestingLogMessageAdded(text_clone.to_owned())).await {
                Ok(_) => {},
                Err(err) => error!("Cannot send testing-log-entry; all receivers were dropped. @err:{err}"),
            }
        }
    };*/
    let log = |text: String| {
        let msg_sender_clone = msg_sender.clone();
        async move {
            info!("TestingLog: {text}");
            //msg_sender.send(GeneralMessage::TestingLogMessageAdded(text.to_owned())).unwrap();
            match msg_sender_clone.broadcast(GeneralMessage::TestingLogMessageAdded(text.to_owned())).await {
                Ok(_) => {},
                Err(err) => error!("Cannot send testing-log-entry; all receivers were dropped. @err:{err}"),
            }
        }
    };

    let sequence_info_str = format!("@steps:{}", sequence.steps.len());
    log(format!("Starting execution of test-sequence. {}", sequence_info_str)).await;

    for step in sequence.steps {
        log(format!("Executing test-step:{}", serde_json::to_string(&step).unwrap())).await;
        // todo
    }
    
    log(format!("Ending execution of test-sequence. {}", sequence_info_str)).await;
    return Ok(());
}