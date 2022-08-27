use rust_shared::anyhow::Error;
use rust_shared::{async_graphql, async_graphql::{SimpleObject, InputObject}};
use flume::Sender;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::{self as rust_shared, serde_json, tokio, tokio_sleep};
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde;
use tracing::{error, info};

use crate::{GeneralMessage, pgclient::create_client, utils::type_aliases::{JSONValue, ABSender}};

wrap_slow_macros!{

#[derive(SimpleObject, InputObject, Debug, Clone, Serialize, Deserialize)] //#[serde(crate = "rust_shared::serde")]
pub struct TestSequence {
	steps: Vec<TestStep>,
}
#[derive(SimpleObject, InputObject, Debug, Clone, Serialize, Deserialize)] //#[serde(crate = "rust_shared::serde")]
pub struct TestStep {
	preWait: Option<u64>,
	postWait: Option<u64>,

	stepBatch: Option<TS_StepBatch>,
	addNodeRevision: Option<TS_AddNodeRevision>,
}
#[derive(SimpleObject, InputObject, Debug, Clone, Serialize, Deserialize)] //#[serde(crate = "rust_shared::serde")]
pub struct TS_StepBatch {
	steps: Vec<TestStep>,
    repeatCount: Option<u32>,
}
#[derive(SimpleObject, InputObject, Debug, Clone, Serialize, Deserialize)] //#[serde(crate = "rust_shared::serde")]
pub struct TS_AddNodeRevision {
	nodeID: String,
}

}

fn flatten_steps(steps: Vec<TestStep>) -> Vec<TestStep> {
    let mut result: Vec<TestStep> = vec![];
    for step in steps {
        if let Some(batch) = &step.stepBatch {
            let substeps_flat_unrepeated = flatten_steps(batch.steps.clone());
            let mut substeps_final: Vec<TestStep> = vec![];
            let repeat_count = batch.repeatCount.unwrap_or(1);
            for _i in 0..repeat_count {
                substeps_final.extend(substeps_flat_unrepeated.clone());
            }
            
            // only flatten/unwrap this step-batch if it actually has substeps (else the wait-values would be lost/ignored)
            let substeps_final_len = substeps_final.len();
            if substeps_final_len > 0 {
                // add the container-step's wait-values to the first/last steps in its flattened output
                if step.preWait.is_some() {
                    substeps_final[0].preWait = Some(substeps_final[0].preWait.unwrap_or(0) + step.preWait.unwrap());
                }
                if step.postWait.is_some() {
                    substeps_final[substeps_final_len - 1].postWait = Some(substeps_final[substeps_final_len - 1].postWait.unwrap_or(0) + step.postWait.unwrap());
                }

                result.extend(substeps_final);
                continue;
            }
        }

        result.push(step);
    }
    result
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

    let flattened_steps = flatten_steps(sequence.steps);

    for step in flattened_steps {
        log(format!("Executing test-step:{}", serde_json::to_string(&step).unwrap())).await;
        let preWait = step.preWait.unwrap_or(0);
        let postWait = step.postWait.unwrap_or(0);
        tokio_sleep(preWait).await;
        execute_test_step(step).await;
        tokio_sleep(postWait).await;
    }
    
    log(format!("Ending execution of test-sequence. {}", sequence_info_str)).await;
    return Ok(());
}

async fn execute_test_step(step: TestStep) {
    if let Some(comp) = step.addNodeRevision {
        // todo
    }
}