use std::{env, fs::{self, File}, str::FromStr, sync::Arc, io::Read, time::SystemTime};

use anyhow::{Context, anyhow, Error, bail, ensure};
use axum::http;
use bytes::Bytes;
use futures::StreamExt;
use http_body_util::{Empty, Full};
use hyper::{upgrade, body::Body};
use hyper_rustls::HttpsConnector;
use itertools::Itertools;
use reqwest::{Url, Body as ReqwestBody};
use rustls::ClientConfig;
use serde_json::{json, self};
use tokio_tungstenite::{WebSocketStream, connect_async, connect_async_tls_with_config, tungstenite::{self, Message, protocol::WebSocketConfig}};
use tower::ServiceBuilder;
use super::{type_aliases::JSONValue, k8s::cert_handling::get_reqwest_client_with_k8s_certs};
use tracing::{info, error, instrument::WithSubscriber, warn};

use crate::{domains::{get_server_url, DomainsConstants}, utils::k8s::{cert_handling::{get_hyper_client_with_k8s_certs, get_rustls_config_dangerous}, k8s_client::{upgrade_to_websocket}, k8s_structs::K8sSecret}};

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

pub async fn try_get_k8s_secret(name: String, namespace: &str) -> Result<Option<K8sSecret>, Error> {
    match get_or_create_k8s_secret(name, namespace, None).await {
        Ok(secret) => Ok(Some(secret)),
        Err(err) => {
            if err.to_string().contains("No k8s secret found named ") {
                Ok(None)
            } else {
                Err(err)
            }
        }
    }
}
pub async fn get_or_create_k8s_secret(name: String, namespace: &str, new_data_if_missing: Option<JSONValue>) -> Result<K8sSecret, Error> {
    info!("Beginning request to get/create the k8s-secret named \"{name}\".");
    let token = fs::read_to_string("/var/run/secrets/kubernetes.io/serviceaccount/token")?;
    let k8s_host = env::var("KUBERNETES_SERVICE_HOST")?;
    let k8s_port = env::var("KUBERNETES_PORT_443_TCP_PORT")?;

    let client = get_reqwest_client_with_k8s_certs()?;

    let req = client.get(format!("https://{k8s_host}:{k8s_port}/api/v1/namespaces/{namespace}/secrets/{name}"))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {token}"))
        .body(json!({}).to_string()).build()?;
    let res = client.execute(req).await?;
    let res_as_json = res.json::<JSONValue>().await?;
    //if DomainsConstants::new().on_server_and_dev { info!("Got response from k8s server, on trying to get secret \"{name}\": {}", res_as_json); }
    // check for failure by checking for a "code" field in the response (if it succeeded, the response json will simply be the secret's json-data)
    if res_as_json["code"].is_null() {
        let secret: K8sSecret = serde_json::from_value(res_as_json)?;
        return Ok(secret);
    }

    if let Some(new_data_if_missing) = new_data_if_missing {
        let new_secret = K8sSecret {
            apiVersion: "v1".to_owned(),
            data: new_data_if_missing,
            metadata: json!({
                "name": name,
                "namespace": namespace,
            }),
            kind: "Secret".to_owned(),
            r#type: "Opaque".to_owned()
        };
        let new_secret_json = serde_json::to_string(&new_secret)?;
    
        let req = client.post(format!("https://{k8s_host}:{k8s_port}/api/v1/namespaces/{namespace}/secrets"))
        //let req = client.put(format!("https://{k8s_host}:{k8s_port}/api/v1/namespaces/{namespace}/secrets/{name}"))
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {token}"))
            .body(new_secret_json).build()?;
        let res = client.execute(req).await?;
    
        let res_as_str = res.text().await?;
        info!("Got response from k8s server, on trying to create secret \"{name}\": {}", res_as_str);
    
        Ok(new_secret)
    } else {
        bail!("No k8s secret found named \"{}\". Since new_data_if_missing was None, returning this error to indicate no matching secret found. @retrieval_attempt_response:{}", name, res_as_json);
    }
}

pub async fn exec_command_in_another_pod(pod_namespace: &str, pod_name: &str, container: Option<&str>, command_name: &str, command_args: Vec<String>, allow_utf8_lossy: bool) -> Result<String, Error> {
    info!("Beginning request to run command in another pod. @target_pod:{} @command_name:{} @command_args:{:?}", pod_name, command_name, command_args);
    let token = fs::read_to_string("/var/run/secrets/kubernetes.io/serviceaccount/token").context("Failed to retrieve k8s service-account token.")?;
    /*let k8s_host = env::var("KUBERNETES_SERVICE_HOST")?;
    let k8s_port = env::var("KUBERNETES_PORT_443_TCP_PORT")?;*/

    let mut query_str = format!("?command={}", command_name);
    for arg in &command_args {
        query_str.push_str(&format!("&command={}", arg));
    }
    if let Some(container) = container {
        query_str.push_str(&format!("&container={}", container));
    }
    query_str.push_str("&stdin=true&stderr=true&stdout=true&tty=true");

    // using hyper
    let client = get_hyper_client_with_k8s_certs().context("Failed to create hyper client with k8s certs.")?;
    let req = hyper::Request::builder().uri(format!("https://kubernetes.default.svc.cluster.local/api/v1/namespaces/{}/pods/{}/exec{}", pod_namespace, pod_name, query_str))
        .method("GET")
        .header("Authorization", format!("Bearer {token}"))
        //.body(Full::new(Bytes::new()))
        .body(Empty::<Bytes>::new())
        .unwrap();
    let response = upgrade_to_websocket(client, req).await.context("Failed to upgrade to websocket.")?;

    // using reqwest
    /*let client = get_reqwest_client_with_k8s_certs().context("Failed to create reqwest client with k8s certs.")?;
    let req = client.get(format!("https://kubernetes.default.svc.cluster.local/api/v1/namespaces/{}/pods/{}/exec{}", pod_namespace, pod_name, query_str))
        .header("Authorization", format!("Bearer {token}"))
        //.body(vec![])
        .body(Bytes::new())
        .build()?;
    let response = upgrade_to_websocket_reqwest(client, req).await.context("Failed to upgrade to websocket (reqwest).")?;*/

    let mut res_as_str = String::new();
    let mut response_remaining = response;
    loop {
        let (next_item, rest_of_response) = response_remaining.into_future().await;
        response_remaining = rest_of_response;
        match next_item {
            Some(Ok(item)) => {
                let item_into_text = match item {
                    // so far anyway, all of the asked-for content has been returned within `Message::Binary` chunks
                    Message::Binary(data) => match allow_utf8_lossy {
                        true => String::from_utf8_lossy(&data).to_string(),
                        false => String::from_utf8(data).map_err(|_| anyhow!("Got non-utf8 data from k8s exec endpoint, and allow_utf8_lossy was false."))?,
                    },
                    // but we'll keep processing text chunks as well, in case they are used in some cases
                    Message::Text(string) => {
                        warn!("Got unexpected text-chunk. @len:{} @string:{}", string.len(), string);
                        string
                    },
                    msg => {
                        println!("Ignoring web-socket message:{:?}", msg);
                        continue;
                    },
                };
                let item_as_str = item_into_text.as_str();
                let item_as_chars = item_as_str.chars().collect_vec();
                let pos_of_first_soh = item_as_chars.iter().position(|ch| *ch == char::from_u32(0x0001).unwrap());
                //println!("Got item. @len:{} @sohChar1st:{:?} @sohCharLast:{:?}", item_as_str.len(), pos_of_first_soh);

                // ignore items without the `0x0001` char (SOH control character) at start; these are just the k8s metadata chunks output at end (should only be 2 of these)
                if pos_of_first_soh != Some(0) {
                    continue;
                }

                // chop off the `0x0001` char (SOH control character) at start of each "actual data" chunk
                let item_as_str_cleaned = item_as_chars[1..].iter().cloned().collect::<String>();
                res_as_str.push_str(&item_as_str_cleaned);
                //info!("Res_as_str so far length:{}", res_as_str.len()); // only log length, otherwise logs so much that docker stops streaming-logs/responding-to-commands
            }
            Some(Err(e)) => return Err(e.into()),
            None => break,
        }
    }

    info!("Got response from k8s server, on trying to run command using exec. @command:\"{} {}\" @response_len: {}", command_name, command_args.join(" "), res_as_str.len());
    Ok(res_as_str)
}