use std::{env, fs::{self, File}, str::FromStr, sync::Arc, io::Read, time::SystemTime};

use anyhow::{Context, anyhow, Error, bail, ensure};
use axum::http;
use bytes::Bytes;
use futures::StreamExt;
use http_body_util::Full;
use hyper::{upgrade, body::Body};
use hyper_rustls::HttpsConnector;
use itertools::Itertools;
use reqwest::Url;
use rustls::ClientConfig;
use serde_json::{json, self};
use tokio_tungstenite::{WebSocketStream, connect_async, connect_async_tls_with_config, tungstenite::{self, Message, protocol::WebSocketConfig}};
use tower::ServiceBuilder;
use super::{type_aliases::JSONValue, k8s::cert_handling::get_reqwest_client_with_k8s_certs};
use tracing::{info, error, instrument::WithSubscriber, warn};

use crate::{utils::k8s::{k8s_structs::K8sSecret, k8s_client::upgrade_to_websocket, cert_handling::{get_hyper_client_with_k8s_certs, get_rustls_config_dangerous}}, domains::{get_server_url, DomainsConstants}};

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
    let token = fs::read_to_string("/var/run/secrets/kubernetes.io/serviceaccount/token")?;
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

    let client = get_hyper_client_with_k8s_certs()?;
    //let client = get_reqwest_client_with_k8s_certs()?;
    /*let req = client.get(format!("https://kubernetes.default.svc.cluster.local/api/v1/namespaces/{}/pods/{}/exec{}", pod_namespace, pod_name, query_str))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {token}"))
        .body(vec![]).build()?;*/
    //let req = tungstenite::http::Request::builder().uri(format!("https://{k8s_host}:{k8s_port}/api/v1/namespaces/{}/pods/{}/exec{}", pod_namespace, pod_name, query_str))
    let req = tungstenite::http::Request::builder().uri(format!("https://kubernetes.default.svc.cluster.local/api/v1/namespaces/{}/pods/{}/exec{}", pod_namespace, pod_name, query_str))
        .method("GET")
        .header("Authorization", format!("Bearer {token}"))
        //.body(()).unwrap();
        //.body(vec![]).unwrap();
        .body(Full::new(Bytes::new())).unwrap();

    // commented; this doesn't work for endpoints that require https->ws upgrade (eg. exec), so we just always use the semi-manual approach below instead
    /*let pods: Api<Pod> = Api::namespaced(client, pod_namespace);
    let attached = pods.exec(pod_name, command_name_and_args, &AttachParams::default().tty(false).stderr(true)).await?;
    //Api::attach(&self, name, ap).await.unwrap().*/

    // this route gets error: "URL error: URL scheme not supported"
    // (seems the issue is that the function used expects a websocket connection from the start, ie. it cannot handle the tricky upgrade part)
    //let res_as_str = process_exec_ws_messages(req).await?;

    // if desired, the websocket connection code is probably not that hard to extract; for ref: https://github.com/kubernetes-client/python/issues/409#issuecomment-1241425302
    // this route gets error (using direct hyper): "failed to switch protocol: 403 Forbidden"
    let mut response = upgrade_to_websocket(client, req).await?;
    let mut res_as_str = String::new();
    loop {
        let (next_item, rest_of_response) = response.into_future().await;
        response = rest_of_response;
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
            }
            Some(Err(e)) => return Err(e.into()),
            None => break,
        }
    }

    info!("Got response from k8s server, on trying to run command using exec. @command:\"{} {}\" @response_len: {}", command_name, command_args.join(" "), res_as_str.len());
    Ok(res_as_str)
}

/*pub async fn process_exec_ws_messages(req: tokio_tungstenite::tungstenite::http::Request<()>) -> Result<String, Error> {
    //let (mut socket, response) = connect_async(req).await?;
    let (mut socket, response) = connect_async_tls_with_config(req, None, Some(tokio_tungstenite::Connector::Rustls(Arc::new(get_rustls_config_dangerous()?)))).await?;
    info!("Connection made with k8s api's exec endpoint. @response:{response:?}");

    let mut combined_result = String::new();
    loop {
        let msg = match socket.next().await {
            None => {
                // when None is returned, it means stream has ended, so break this loop
                break;
            },
            Some(entry) => match entry {
                Ok(msg) => msg,
                Err(err) => {
                    bail!("Error reading message from websocket connection:{}", err);
                }
            },
        };
        let msg_as_str = msg.into_text().unwrap();
        info!("Got websocket message: {}", msg_as_str);
        combined_result.push_str(&msg_as_str);
    }
    Ok(combined_result)
}*/