use std::{sync::Arc, fs::File, io::Read};

use anyhow::{ensure, Context, Error};
use bytes::Bytes;
use http_body_util::Full;
use hyper::body::{self, Body};
use hyper_rustls::HttpsConnector;
use hyper_util::{client::legacy::{connect::HttpConnector, Client}, rt::TokioExecutor};
use rustls::{client::danger::{HandshakeSignatureValid, ServerCertVerified, ServerCertVerifier}, internal::msgs::codec::Codec, pki_types::{CertificateDer, ServerName, UnixTime}, version::TLS12, ClientConfig, DigitallySignedStruct, SupportedProtocolVersion};
use tracing::{info, warn};

use crate::to_anyhow;

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
pub fn get_hyper_client_with_k8s_certs<B: Body + Send>() -> Result<Client<HttpsConnector<HttpConnector>, B>, Error> where <B as Body>::Data: Send {
    // to implement/workaround tls handling, see here: https://stackoverflow.com/a/72847362/2441655
    //hyper::client::Builder::build(&self, connect_with_config(request, config, max_redirects))
    let https = hyper_rustls::HttpsConnectorBuilder::new()
        //.with_native_roots()
        .with_tls_config(get_rustls_config_dangerous()?)
        .https_only()
        .enable_http1()
        .build();

    /*let client: Client<_, hyper::body::Body> = Client::builder().build(https);
    Ok(client)*/
    Ok(Client::builder(TokioExecutor::new()).build(https))
}

pub fn get_rustls_config_dangerous() -> Result<ClientConfig, Error> {
    let cert_file = File::open("/var/run/secrets/kubernetes.io/serviceaccount/ca.crt")?;
    /*let mut buf = Vec::new();
    cert_file.read_to_end(&mut buf)?;*/
    let cert_file_reader = &mut std::io::BufReader::new(cert_file);

    /*let mut store = rustls::RootCertStore::empty();
    warn!("BytesRead:{} @firstBytes:{:?}", buf.len(), Bytes::copy_from_slice(&buf[..100]));
    //let cert = reqwest::Certificate::from_pem(&buf)?;
    let cert = CertificateDer::read_bytes(&buf).map_err(to_anyhow).context("Failed to parse k8s certificate file.")?;
    let (certs_added, certs_ignored) = store.add_parsable_certificates(vec![cert]);
    warn!("CertsAdded:{} CertsIgnored:{}", certs_added, certs_ignored);
    ensure!(certs_added > 0, "No certificates were added to the store.");
    ensure!(certs_ignored == 0, "Some certificates were ignored.");*/

    let mut store = rustls::RootCertStore::empty();
    //let cert = rustls_pemfile::certs(&mut std::io::BufReader::new(&buf)).unwrap().pop().unwrap();
    //store.add(&rustls::Certificate(cert)).unwrap();
    for cert in rustls_pemfile::certs(cert_file_reader) {
        match cert {
            Ok(cert) => store.add(cert).unwrap(),
            Err(err) => warn!("Failed to parse a certificate from the k8s certificate file. @err:{}", err),
        }
    }
    
    let mut config =
    //ClientConfig::builder()
    ClientConfig::builder_with_protocol_versions(&[&TLS12])
        //.with_safe_defaults()
        // new equivalent of with_safe_defaults()
        /*.with_safe_default_cipher_suites()
        .with_safe_default_kx_groups()
        .with_safe_default_protocol_versions()*/
        //.with_protocol_versions(&[rustls::version::TLS12])
        
        .with_root_certificates(store)
        .with_no_client_auth();

    // temp: For now, completely disable cert-verification for connecting to the k8s service, to avoid "presented server name type wasn't supported" error.
    // This step won't be necessary once the issue below is resolved:
    // * issue in rustls (key comment): https://github.com/rustls/rustls/issues/184#issuecomment-1116235856
    // * pull-request in webpki subdep: https://github.com/briansmith/webpki/pull/260
    // EDIT(2024-03-08, after on version with supposed fix): Tried removing this section, and got error: "invalid peer certificate: UnknownIssuer"
    let mut dangerous_config = ClientConfig::dangerous(&mut config);
    dangerous_config.set_certificate_verifier(Arc::new(NoCertificateVerification {}));

    Ok(config)
}
#[derive(Debug)]
pub struct NoCertificateVerification {}
impl ServerCertVerifier for NoCertificateVerification {
    fn verify_server_cert(
        &self,
        _end_entity: &CertificateDer<'_>,
        _intermediates: &[CertificateDer<'_>],
        _server_name: &ServerName<'_>,
        _ocsp_response: &[u8],
        _now: UnixTime,
    ) -> Result<ServerCertVerified, rustls::Error> {
        Ok(ServerCertVerified::assertion())
    }

    fn verify_tls12_signature(
        &self,
        _message: &[u8],
        _cert: &CertificateDer<'_>,
        _dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, rustls::Error> {
        Ok(HandshakeSignatureValid::assertion())
    }
    
    fn verify_tls13_signature(
        &self,
        _message: &[u8],
        _cert: &CertificateDer<'_>,
        _dss: &DigitallySignedStruct,
    ) -> Result<rustls::client::danger::HandshakeSignatureValid, rustls::Error> {
        Ok(rustls::client::danger::HandshakeSignatureValid::assertion())
    }
    
    fn supported_verify_schemes(&self) -> Vec<rustls::SignatureScheme> {
        use rustls::SignatureScheme::*;
        vec![
            RSA_PKCS1_SHA1,
            ECDSA_SHA1_Legacy,
            RSA_PKCS1_SHA256,
            ECDSA_NISTP256_SHA256,
            RSA_PKCS1_SHA384,
            ECDSA_NISTP384_SHA384,
            RSA_PKCS1_SHA512,
            ECDSA_NISTP521_SHA512,
            RSA_PSS_SHA256,
            RSA_PSS_SHA384,
            RSA_PSS_SHA512,
            ED25519,
            ED448,
        ]
    }
}