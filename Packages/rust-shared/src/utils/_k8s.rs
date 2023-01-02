use std::{env, fs::{self, File}, str::FromStr, sync::Arc, io::Read};

use anyhow::{Context, anyhow, Error, bail, ensure};
use axum::http;
use futures::StreamExt;
use hyper::{upgrade, Body};
use itertools::Itertools;
use k8s_openapi::api::core::v1::Pod;
use kube::{Api, Client, api::{AttachParams, AttachedProcess}};
use reqwest::Url;
use rustls::ClientConfig;
use serde_json::{json, self};
use tokio_tungstenite::{WebSocketStream, connect_async, connect_async_tls_with_config};
use tower::ServiceBuilder;
use super::type_aliases::JSONValue;
use tracing::{info, error, instrument::WithSubscriber};

use crate::{utils::k8s::k8s_structs::K8sSecret, domains::{get_server_url, DomainsConstants}};

pub fn get_reqwest_client_with_k8s_certs() -> Result<reqwest::Client, Error> {
    /*let mut buf = Vec::new();
    File::open("/var/run/secrets/kubernetes.io/serviceaccount/ca.crt")?
        .read_to_end(&mut buf)?;
    let cert = reqwest::Certificate::from_pem(&buf)?;
    Ok(reqwest::ClientBuilder::new()
        .add_root_certificate(cert).build()?)*/

    // temp: For now, completely disable cert-verification for connecting to the k8s service, to avoid "presented server name type wasn't supported" error.
    // This step won't be necessary once the issue below is resolved:
    // * issue in rustls (key comment): https://github.com/rustls/rustls/issues/184#issuecomment-1116235856
    // * pull-request in webpki subdep: https://github.com/briansmith/webpki/pull/260
    Ok(reqwest::ClientBuilder::new()
        .danger_accept_invalid_certs(true).build()?)
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

pub async fn get_or_create_k8s_secret(name: String, new_data_if_missing: JSONValue) -> Result<K8sSecret, Error> {
    info!("Beginning request to get/create the k8s-secret named \"{name}\".");
    let token = fs::read_to_string("/var/run/secrets/kubernetes.io/serviceaccount/token")?;
    let k8s_host = env::var("KUBERNETES_SERVICE_HOST")?;
    let k8s_port = env::var("KUBERNETES_PORT_443_TCP_PORT")?;

    let client = get_reqwest_client_with_k8s_certs()?;

    let req = client.get(format!("https://{k8s_host}:{k8s_port}/api/v1/namespaces/default/secrets/{name}"))
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

    let new_secret = K8sSecret {
        apiVersion: "v1".to_owned(),
        data: new_data_if_missing,
        metadata: json!({
            "name": name,
            "namespace": "default",
        }),
        kind: "Secret".to_owned(),
        r#type: "Opaque".to_owned()
    };
    let new_secret_json = serde_json::to_string(&new_secret)?;

    let req = client.post(format!("https://{k8s_host}:{k8s_port}/api/v1/namespaces/default/secrets"))
    //let req = client.put(format!("https://{k8s_host}:{k8s_port}/api/v1/namespaces/default/secrets/{name}"))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {token}"))
        .body(new_secret_json).build()?;
    let res = client.execute(req).await?;

    let res_as_str = res.text().await?;
    info!("Got response from k8s server, on trying to create secret \"{name}\": {}", res_as_str);

    Ok(new_secret)
}

/// This variant is often needed, as many commands require that they be run as part of a shell. (eg. pgdump)
/*pub async fn exec_command_in_another_pod_in_shell(pod_namespace: &str, pod_name: &str, container: Option<&str>, command_name: &str, command_args: Vec<String>) -> Result<String, Error> {
    let command_name_final = "sh";
    let command_args_final = vec!["-c".to_owned(), format!("{} {}", command_name, command_args.join(" "))];
    exec_command_in_another_pod(pod_namespace, pod_name, container, command_name_final, command_args_final).await
}*/
pub async fn exec_command_in_another_pod(pod_namespace: &str, pod_name: &str, container: Option<&str>, command_name: &str, command_args: Vec<String>) -> Result<String, Error> {
    info!("Beginning request to run command in another pod. @target_pod:{} @command_name:{} @command_args:{:?}", pod_name, command_name, command_args);
    let token = fs::read_to_string("/var/run/secrets/kubernetes.io/serviceaccount/token")?;
    let k8s_host = env::var("KUBERNETES_SERVICE_HOST")?;
    let k8s_port = env::var("KUBERNETES_PORT_443_TCP_PORT")?;

    //let client = get_reqwest_client_with_k8s_certs()?;

    let mut query_str = format!("?command={}", command_name);
    for arg in &command_args {
        query_str.push_str(&format!("&command={}", arg));
    }
    if let Some(container) = container {
        query_str.push_str(&format!("&container={}", container));
    }
    query_str.push_str("&stdin=true&stderr=true&stdout=true&tty=true");

    /*let req = client.get(format!("https://{k8s_host}:{k8s_port}/api/v1/namespaces/{}/pods/{}/exec{}", pod_namespace, pod_name, query_str))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {token}"))
        .body(vec![]).build()?;
    let res = client.execute(req).await?;
    let res_as_str = res.text().await?;*/
    
    /*let req = http::Request::get(format!("https://{k8s_host}:{k8s_port}/api/v1/namespaces/{}/pods/{}/exec{}", pod_namespace, pod_name, query_str)).body(vec![])?;
    let stream = ws_connect(req).await?;
    let res_as_str = "".to_owned();
    for msg in stream {
        res_as_str.push_str(msg);
    }*/

    /*let req_url_str = format!("https://{k8s_host}:{k8s_port}/api/v1/namespaces/{}/pods/{}/exec{}", pod_namespace, pod_name, query_str);
    let req_url = Url::parse(&req_url_str).unwrap();
    let res_as_str = process_exec_ws_messages(req_url).await?;*/

    //let req = tokio_tungstenite::tungstenite::http::Request::builder().uri(format!("wss://{k8s_host}:{k8s_port}/api/v1/namespaces/{}/pods/{}/exec{}", pod_namespace, pod_name, query_str))
    // use domain-version to get around bug with ip-addresses listed in comment near top of file
    //let req = tokio_tungstenite::tungstenite::http::Request::builder().uri(format!("wss://kubernetes.default.svc.cluster.local/api/v1/namespaces/{}/pods/{}/exec{}", pod_namespace, pod_name, query_str))
    let req = tokio_tungstenite::tungstenite::http::Request::builder().uri(format!("https://kubernetes.default.svc.cluster.local/api/v1/namespaces/{}/pods/{}/exec{}", pod_namespace, pod_name, query_str))
        .method("GET")
        //.method("POST")
        //.header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {token}"))
        //.body(()).unwrap();
        .body(vec![]).unwrap();
    //let res_as_str = process_exec_ws_messages(req).await?;

    let client = Client::try_default().await?;
    let mut response = client.connect(req).await?;
    let mut res_as_str = String::new();
    let mut item_index = -1;
    loop {
        item_index += 1;
        let (next_item, rest_of_response) = response.into_future().await;
        response = rest_of_response;
        match next_item {
            Some(Ok(item)) => {
                let item_into_text = item.into_text()?;
                let item_as_str = item_into_text.as_str();
                let item_as_chars = item_as_str.chars().collect_vec();
                let pos_of_first_soh = item_as_chars.iter().position(|ch| *ch == char::from_u32(0x0001).unwrap());
                //let pos_of_last_soh = item_as_chars.iter().rposition(|ch| *ch == char::from_u32(0x0001).unwrap());
                //println!("Got item. @len:{} @sohChar1st:{:?} @sohCharLast:{:?}", item_as_str.len(), pos_of_first_soh, pos_of_last_soh);

                // ignore first two items; these are just k8s metadata (though do assert to make sure)
                if item_index == 0 || item_index == 1  {
                    ensure!(item_as_str.len() == 1, "First two items were not the empty headers expected!");
                    continue;
                }
                // ignore items without the `0x0001` char (SOH control character) at start; these are just k8s metadata chunks output at end (should only be 2 of these)
                if pos_of_first_soh != Some(0) {
                    continue;
                }

                // chop off the `0x0001` char (SOH control character) at start of each "actual data" chunk
                let item_as_str_cleaned = item_as_chars[1..].iter().cloned().collect::<String>();
                res_as_str.push_str(&item_as_str_cleaned);
            }
            Some(Err(e)) => {
                return Err(e.into());
            }
            None => {
                break;
            }
        }
    }

    info!("Got response from k8s server, on trying to run command using exec. @command:\"{} {}\" @response_len: {}", command_name, command_args.join(" "), res_as_str.len());
    Ok(res_as_str)
}

pub async fn process_exec_ws_messages(req: tokio_tungstenite::tungstenite::http::Request<()>) -> Result<String, Error> {
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
}

fn get_rustls_config_dangerous() -> Result<ClientConfig, Error> {
    let mut store = rustls::RootCertStore::empty();

    let mut buf = Vec::new();
    File::open("/var/run/secrets/kubernetes.io/serviceaccount/ca.crt")?
        .read_to_end(&mut buf)?;
    //let cert = reqwest::Certificate::from_pem(&buf)?;
    store.add_parsable_certificates(&[buf]);
    
    let mut config = ClientConfig::builder()
        .with_safe_defaults()
        .with_root_certificates(store)
        .with_no_client_auth();

    // temp: For now, completely disable cert-verification for connecting to the k8s service, to avoid "presented server name type wasn't supported" error.
    // This step won't be necessary once the issue below is resolved:
    // * issue in rustls (key comment): https://github.com/rustls/rustls/issues/184#issuecomment-1116235856
    // * pull-request in webpki subdep: https://github.com/briansmith/webpki/pull/260
    let mut dangerous_config = ClientConfig::dangerous(&mut config);
    dangerous_config.set_certificate_verifier(Arc::new(NoCertificateVerification {}));

    Ok(config)
}
struct NoCertificateVerification {}
impl rustls::client::ServerCertVerifier for NoCertificateVerification {
    fn verify_server_cert(
        &self,
        _end_entity: &rustls::Certificate,
        _intermediates: &[rustls::Certificate],
        _server_name: &rustls::ServerName,
        _scts: &mut dyn Iterator<Item = &[u8]>,
        _ocsp: &[u8],
        _now: std::time::SystemTime,
    ) -> Result<rustls::client::ServerCertVerified, rustls::Error> {
        Ok(rustls::client::ServerCertVerified::assertion())
    }
}

/*/// Make WebSocket connection.
pub async fn ws_connect(request: hyper::Request<Vec<u8>>) -> Result<WebSocketStream<hyper::upgrade::Upgraded>, Error> {
    use http::header::HeaderValue;
    let (mut parts, body) = request.into_parts();
    parts
        .headers
        .insert(http::header::CONNECTION, HeaderValue::from_static("Upgrade"));
    parts
        .headers
        .insert(http::header::UPGRADE, HeaderValue::from_static("websocket"));
    parts.headers.insert(
        http::header::SEC_WEBSOCKET_VERSION,
        HeaderValue::from_static("13"),
    );
    let key = upgrade::sec_websocket_key();
    parts.headers.insert(
        http::header::SEC_WEBSOCKET_KEY,
        key.parse().expect("valid header value"),
    );
    // Use the binary subprotocol v4, to get JSON `Status` object in `error` channel (3).
    // There's no official documentation about this protocol, but it's described in
    // [`k8s.io/apiserver/pkg/util/wsstream/conn.go`](https://git.io/JLQED).
    // There's a comment about v4 and `Status` object in
    // [`kublet/cri/streaming/remotecommand/httpstream.go`](https://git.io/JLQEh).
    parts.headers.insert(
        http::header::SEC_WEBSOCKET_PROTOCOL,
        HeaderValue::from_static(upgrade::WS_PROTOCOL),
    );

    let res = Request::from_parts(parts, Body::from(body)).await?;
    upgrade::verify_response(&res, &key).map_err(Error::UpgradeConnection)?;
    match hyper::upgrade::on(res).await {
        Ok(upgraded) => {
            Ok(WebSocketStream::from_raw_socket(upgraded, ws::protocol::Role::Client, None).await)
        }

        /*Err(e) => Err(Error::UpgradeConnection(
            UpgradeConnectionError::GetPendingUpgrade(e),
        )),*/
        Err(e) => bail!("Hit error: {:?}", e)
    }
}*/

// version using the "kube" crate to access the k8s api instead
pub async fn exec_command_in_another_pod_using_kube(pod_namespace: &str, pod_name: &str, command_name_and_args: Vec<String>) -> Result<String, Error> {
    info!("Beginning request to run command in another pod. @target_pod:{} @command_name_and_args:{:?}", pod_name, command_name_and_args);
    // this part handled automatically by kube crate
    /*let token = fs::read_to_string("/var/run/secrets/kubernetes.io/serviceaccount/token")?;
    let k8s_host = env::var("KUBERNETES_SERVICE_HOST")?;
    let k8s_port = env::var("KUBERNETES_PORT_443_TCP_PORT")?;*/

    let client = Client::try_default().await?;
    /*let config = Config::infer().await?;
    let service = ServiceBuilder::new()
        .layer(config.base_uri_layer())
        .option_layer(config.auth_layer()?)
        .service(hyper::Client::new());
    let client = Client::new(service, config.default_namespace);*/

    //let pods: Api<Pod> = Api::default_namespaced(client);
    let pods: Api<Pod> = Api::namespaced(client, pod_namespace);
    //let pods: Api<Pod> = Api::all(client);

    //Api::attach(&self, name, ap).await.unwrap().

    let attached = pods.exec(pod_name, command_name_and_args, &AttachParams::default().tty(false).stderr(true)).await?;
    //let attached = pods.exec(&format!("{pod_namespace}/{pod_name}"), command_name_and_args, &AttachParams::default().tty(false).stderr(true)).await?;
    let output = get_output(attached).await;
    println!("{output}");

    Ok(output)
}
async fn get_output(mut attached: AttachedProcess) -> String {
    let stdout = tokio_util::io::ReaderStream::new(attached.stdout().unwrap());
    let out = stdout
        .filter_map(|r| async { r.ok().and_then(|v| String::from_utf8(v.to_vec()).ok()) })
        .collect::<Vec<_>>()
        .await
        .join("");
    attached.join().await.unwrap();
    out
}