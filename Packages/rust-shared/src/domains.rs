use std::env;

use anyhow::{ensure, Error};
use reqwest::Url;

use crate::utils::general_::extensions::ToOwnedV;

pub fn get_env() -> String {
    env::var("ENVIRONMENT").unwrap_or("<unknown>".to_string())
}
pub fn is_dev() -> bool { get_env() == "dev" }
pub fn is_prod() -> bool { get_env() == "prod" }

// sync:js
// ==========

pub struct DomainsConstants {
    pub prod_domain: &'static str,
    pub recognized_web_server_hosts: &'static [&'static str],
    pub on_server_and_dev: bool,
    pub on_server_and_prod: bool,
}
impl DomainsConstants {
    pub fn new() -> Self {
        //let ON_SERVER = env::var("ENVIRONMENT").is_some();
        let ON_SERVER = true;
        let ENV = get_env();
        Self {
            prod_domain: "debatemap.app",
            //prod_domain: "debates.app", // temp
            recognized_web_server_hosts: &[
                "localhost:5100", "localhost:5101", // web-server, local-k8s and local-webpack
                "localhost:5130", "localhost:5131", // monitor, local-k8s and local-webpack
                "localhost:5200", // all of the load-balancer-exposed services, on the remote-k8s
                // direct to server
                "9m2x1z.nodes.c1.or1.k8s.ovh.us",
                "debating.app",
                "debatemap.societylibrary.org",
		        // through cloudflare
                "debatemap.app",
                "debates.app",
            ],
            on_server_and_dev: ON_SERVER && ENV == "dev",
            on_server_and_prod: ON_SERVER && ENV == "prod",
        }
    }
}

#[derive(PartialEq, Eq)]
pub enum ServerPod {
    WebServer,
    AppServer,
    Monitor,
    Grafana,
}

pub struct GetServerURL_Options {
    pub claimed_client_url: Option<String>,
    pub restrict_to_recognized_hosts: bool,
    
    pub force_localhost: bool,
    pub force_https: bool,
}

pub fn get_server_url(server_pod: ServerPod, subpath: &str, opts: GetServerURL_Options) -> Result<String, Error> {
    let DomainsConstants { prod_domain, recognized_web_server_hosts, on_server_and_dev, on_server_and_prod: _ } = DomainsConstants::new();

    // process claimed-client-url
	println!("GetServerURL_claimedClientURL: {:?}", opts.claimed_client_url);
	let claimed_client_url = opts.claimed_client_url.map(|str| Url::parse(&str).unwrap());
    let should_trust_claimed_client_url = if let Some(client_url) = &claimed_client_url {
        !opts.restrict_to_recognized_hosts || recognized_web_server_hosts.contains(&client_url.host_str().unwrap()) || on_server_and_dev
    } else { false };
    let claimed_client_url_trusted = if should_trust_claimed_client_url { claimed_client_url.clone() } else { None };

	let mut server_url: Url;

	// section 1: set protocol and hostname
	// ==========

	if let Some(client_url) = claimed_client_url_trusted.as_ref() {
		let port_str = if let Some(port) = client_url.port() { format!(":{}", port) } else { "".o() };
        server_url = Url::parse(&format!("{}//{}{}", client_url.scheme(), client_url.host_str().unwrap(), port_str)).unwrap();
	} else {
		//Assert(webServerHosts.includes(referrerURL.host), `Client sent invalid referrer host (${referrerURL.host}).`);
		let guessed_to_be_local = opts.force_localhost || on_server_and_dev;
		if guessed_to_be_local {
			server_url = Url::parse("http://localhost:5100").unwrap(); // standard local-k8s entry-point
		} else {
			server_url = Url::parse(&format!("https://{}", prod_domain))?;
        }
    }
    
    // section 2: set subdomain/port
    // ==========

    match server_pod {
        ServerPod::WebServer => {
            // for simply deciding between localhost:5100 and localhost:5101, we don't need the claimed-client-url to be "trusted"
            if claimed_client_url.map(|a| a.port()) == Some(Some(5101)) {
                server_url.set_port(Some(5101)).unwrap();
            }
        },
        _ => {},
    }

    // section 3: set path
    // ==========

	ensure!(subpath.starts_with("/"), "Subpath must start with a forward-slash.");
    let mut subpath_final = subpath.to_string();
    match server_pod {
        ServerPod::WebServer => {},
        ServerPod::AppServer => {
            subpath_final = format!("/app-server{}", subpath_final);
        },
        ServerPod::Monitor => {
            subpath_final = format!("/monitor{}", subpath_final);
        },
        ServerPod::Grafana => {
            subpath_final = format!("/grafana{}", subpath_final);
        },
    }
    server_url.set_path(&subpath_final);

    // section 4: special-case handling
    // ==========

    // if this app-server is PROD, but we have a "localhost" host, user must be using the "?db=prod" flag
    /*if on_server_and_prod && (claimed_client_url.as_ref().unwrap().host_str().unwrap() == "localhost:5100" || claimed_client_url.as_ref().unwrap().host_str().unwrap() == "localhost:5101") {
        if subpath == "/auth/google/callback" {
            subpath = "/auth/google/callback_returnToLocalhost";
            server_url.set_path(subpath);
        }
    }*/

    if opts.force_https {
        server_url.set_scheme("https").unwrap();
    }

    Ok(server_url.to_string())
}