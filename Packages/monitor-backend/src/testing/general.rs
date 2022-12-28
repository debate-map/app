use std::env;
use std::str::FromStr;

use rust_shared::chrono::{Utc, SecondsFormat};
use rust_shared::hyper::Method;
use rust_shared::anyhow::Error;
use rust_shared::jwt_simple::prelude::{Claims, MACLike};
use rust_shared::serde_json::json;
use rust_shared::utils::auth::jwt_utils_base::{get_or_create_jwt_key_hs256, UserInfoForJWT};
use rust_shared::utils::db::uuid::{new_uuid_v4_as_b64_id, new_uuid_v4_as_b64};
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::time::{time_since_epoch_ms_i64, tokio_sleep, tokio_sleep_until, time_since_epoch_ms};
use rust_shared::utils::type_aliases::JWTDuration;
use rust_shared::{async_graphql, async_graphql::{SimpleObject, InputObject}};
use rust_shared::db_constants::{SYSTEM_USER_ID};
use flume::Sender;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::{self as rust_shared, serde_json, tokio, to_sub_err};
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde;
use tracing::{error, info};

use crate::utils::general::body_to_str;
use crate::{GeneralMessage, pgclient::create_client, utils::type_aliases::{JSONValue, ABSender}};

wrap_slow_macros!{

#[derive(SimpleObject, InputObject, Debug, Clone, Serialize, Deserialize)] //#[serde(crate = "rust_shared::serde")]
pub struct TestSequence {
	steps: Vec<TestStep>,
}
#[derive(SimpleObject, InputObject, Debug, Clone, Serialize, Deserialize)]
pub struct TestStep {
	enabled: Option<bool>,
	preWait: Option<i64>,
	postWait: Option<i64>,
    waitTillComplete: Option<bool>,
    waitTillDurationX: Option<i64>,

	stepBatch: Option<TS_StepBatch>,
	//signIn: Option<TS_SignIn>,
	addNodeRevision: Option<TS_AddNodeRevision>,
}
#[derive(SimpleObject, InputObject, Debug, Clone, Serialize, Deserialize)]
pub struct TS_StepBatch {
	steps: Vec<TestStep>,
    repeatCount: Option<u32>,
}
/*#[derive(SimpleObject, InputObject, Debug, Clone, Serialize, Deserialize)]
pub struct TS_SignIn {
	username: String,
}*/
#[derive(SimpleObject, InputObject, Debug, Clone, Serialize, Deserialize)]
pub struct TS_AddNodeRevision {
	nodeID: String,
    text: Option<String>,
}

}

fn flatten_steps(steps: Vec<TestStep>) -> Vec<TestStep> {
    let mut result: Vec<TestStep> = vec![];
    for step in steps {
        if !step.enabled.unwrap_or(true) { continue; }

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
        let start_time = time_since_epoch_ms_i64();
        let pre_wait = step.preWait.unwrap_or(0);
        let post_wait = step.postWait.unwrap_or(0);
        let min_duration = step.waitTillDurationX.unwrap_or(0);

        tokio_sleep(pre_wait).await;
        execute_test_step(step).await?;
        tokio_sleep(post_wait).await;
        
        tokio_sleep_until(start_time + min_duration).await;
    }
    
    log(format!("Ending execution of test-sequence. {}", sequence_info_str)).await;
    return Ok(());
}

async fn execute_test_step(step: TestStep) -> Result<(), Error> {
    //if let Some(comp) = step.signIn {}
    if let Some(comp) = step.addNodeRevision {
        let fut = post_request_to_app_server(json!({
            "variables": {
                "input": {
                    "mapID": "GLOBAL_MAP_00000000001",
                    "revision": {
                        "node": comp.nodeID,
                        "phrasing": {
                            "terms": [],
                            "text_base": comp.text
                                .unwrap_or("ValForTestRevision_At:[datetime-ms]".o())
                                // some special values that can be used in the text
                                .replace("[time]", &time_since_epoch_ms_i64().to_string())
                                .replace("[datetime]", Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true).replace("T", " ").replace("Z", "").as_str())
                                .replace("[datetime-ms]", Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true).replace("T", " ").replace("Z", "").as_str())
                                .replace("[uuid]", &new_uuid_v4_as_b64())
                        },
                        "attachments": []
                    }
                }
            },
            "query": "mutation($input: AddNodeRevisionInput) { addNodeRevision(input: $input) { id } }"
        }));

        if step.waitTillComplete.unwrap_or(true) {
            fut.await?;
        } else {
            tokio::spawn(async move {
                if let Err(err) = fut.await {
                    error!("Got error during non-awaited execution of test-step with type addNodeRevision:{:?}", err);
                }
            });
        }
    }
    Ok(())
}

async fn post_request_to_app_server(message: serde_json::Value) -> Result<JSONValue, Error> {
    // maybe temp; on every request, create a new JWT, authenticating this request as the system-user (less complicated, albeit not terribly elegant)
    let user_data = UserInfoForJWT { id: SYSTEM_USER_ID.o(), email: "debatemap@gmail.com".o() };
    let jwt_duration = 60 * 60 * 24 * 7; // = 604800 seconds = 1 week
    let key = get_or_create_jwt_key_hs256().await.map_err(to_sub_err)?;
    let claims = Claims::with_custom_claims(user_data, JWTDuration::from_secs(jwt_duration.try_into().map_err(to_sub_err)?));
    let jwt = key.authenticate(claims).map_err(to_sub_err)?;
    //info!("Generated dev JWT:{}", jwt);

    let client = rust_shared::hyper::Client::new();
    let req = rust_shared::hyper::Request::builder()
        .method(Method::POST)
        .uri("http://dm-app-server.default.svc.cluster.local:5110/graphql")
        .header("Content-Type", "application/json")
        // temp; use db-password as way to prove this request is from an internal pod, and thus doesn't need to be signed-in
        //.header("SecretForRunAsSystem", env::var("DB_PASSWORD").unwrap())
        .header("authorization", format!("Bearer {}", jwt))
        .body(message.to_string().into())?;
    let res = client.request(req).await?;
    let res_as_json_str = body_to_str(res.into_body()).await?;
    let res_as_json = JSONValue::from_str(&res_as_json_str)?;
    println!("Done! Response:{}", res_as_json);

    Ok(res_as_json)
}