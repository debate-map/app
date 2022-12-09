use std::{env, fs};

use anyhow::{Context, anyhow, Error};
use serde_json::{json, self};
use super::type_aliases::JSONValue;
use tracing::info;

use crate::utils::k8s::k8s_structs::K8sSecret;

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
    info!("Got response from k8s server, on trying to get secret \"{name}\": {}", res_as_json);
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
/*pub async fn get_or_create_k8s_secret_as_ascii_bytes(name: String, new_val_if_missing_as_bytes: Vec<u8>) -> Result<Vec<u8>, Error> {
    //let new_val_if_missing_str = String::from_utf8(new_val_if_missing)?;
    let new_val_if_missing_as_str = base64::encode(new_val_if_missing_as_bytes);
    let result_str = get_or_create_k8s_secret(name, new_val_if_missing_as_str).await?;
    let result_bytes = base64::decode(result_str)?;
    Ok(result_bytes)
}*/