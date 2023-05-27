use std::{sync::Arc, fs::File, io::Read};

use anyhow::Error;
use hyper::client::HttpConnector;
use hyper_rustls::HttpsConnector;
use rustls::ClientConfig;

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

// this function was created for use by exec_command_in_another_pod; it may need tweaking to support other use-cases
pub fn get_hyper_client_with_k8s_certs() -> Result<hyper::Client<HttpsConnector<HttpConnector>>, Error> {
    // to implement/workaround tls handling, see here: https://stackoverflow.com/a/72847362/2441655
    //hyper::client::Builder::build(&self, connect_with_config(request, config, max_redirects))
    let https = hyper_rustls::HttpsConnectorBuilder::new()
        //.with_native_roots()
        .with_tls_config(get_rustls_config_dangerous()?)
        .https_only()
        .enable_http1()
        .build();

    let client: hyper::Client<_, hyper::Body> = hyper::Client::builder().build(https);
    Ok(client)
}
pub fn get_rustls_config_dangerous() -> Result<ClientConfig, Error> {
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
pub struct NoCertificateVerification {}
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