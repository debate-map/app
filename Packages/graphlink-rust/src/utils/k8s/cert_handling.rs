use std::{fs::File, io::Read, sync::Arc};

use anyhow::{ensure, Context, Error};
use bytes::Bytes;
use http_body_util::Full;
use hyper::body::{self, Body};
use hyper_rustls::HttpsConnector;
use hyper_util::{
	client::legacy::{connect::HttpConnector, Client},
	rt::TokioExecutor,
};
use itertools::Itertools;
use rustls::{pki_types::CertificateDer, ClientConfig, RootCertStore};
use tracing::{info, warn};

use crate::to_anyhow;

pub fn get_k8s_certs() -> Result<Vec<CertificateDer<'static>>, Error> {
	let cert_file = File::open("/var/run/secrets/kubernetes.io/serviceaccount/ca.crt").context("Could not find the k8s certificate file.")?;
	let cert_file_reader = &mut std::io::BufReader::new(cert_file);
	let certs: Vec<CertificateDer> = rustls_pemfile::certs(cert_file_reader).try_collect().map_err(|err| to_anyhow(err).context("Failed to parse a certificate from the k8s certificate file."))?;
	ensure!(certs.len() > 0, "No certificates were found in the k8s certificate file.");
	return Ok(certs);
}
pub fn get_rustls_config_that_accepts_k8s_certs() -> Result<ClientConfig, Error> {
	let mut store = rustls::RootCertStore::empty();
	for cert in get_k8s_certs()? {
		store.add(cert).unwrap();
	}
	Ok(ClientConfig::builder().with_root_certificates(store).with_no_client_auth())
}

// this function was created for use by exec_command_in_another_pod; it may need tweaking to support other use-cases
pub fn get_hyper_client_with_k8s_certs<B: Body + Send>() -> Result<Client<HttpsConnector<HttpConnector>, B>, Error>
where
	<B as Body>::Data: Send,
{
	let https = hyper_rustls::HttpsConnectorBuilder::new()
		//.with_native_roots()
		.with_tls_config(get_rustls_config_that_accepts_k8s_certs()?)
		.https_only()
		.enable_http1()
		.build();
	Ok(Client::builder(TokioExecutor::new()).build(https))
}

pub fn get_reqwest_client_with_k8s_certs() -> Result<reqwest::Client, Error> {
	let mut builder = reqwest::ClientBuilder::new();
	for cert in get_k8s_certs()? {
		let reqwest_cert = reqwest::Certificate::from_der(&cert)?;
		builder = builder.add_root_certificate(reqwest_cert);
	}
	Ok(builder.build()?)
}
