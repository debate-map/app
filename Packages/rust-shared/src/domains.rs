use std::env;

use anyhow::Error;
use reqwest::Url;

pub struct DomainsConstants {
    pub prod_domain: &'static str,
    pub recognized_web_server_hosts: &'static [&'static str],
    pub on_server_and_dev: bool,
    pub on_server_and_prod: bool,
}
impl DomainsConstants {
    pub fn new() -> Self {
        //let ON_SERVER = env::var("ENV").is_some();
        let ON_SERVER = true;
        let ENV = env::var("ENV").unwrap_or("<unknown>".to_string());
        Self {
            prod_domain: "debates.app", // temp
            recognized_web_server_hosts: &[
                "localhost:5100", "localhost:5101",
                "localhost:5130", "localhost:5131",
                "debatemap.app",
                "debates.app",
                "debating.app",
                "9m2x1z.nodes.c1.or1.k8s.ovh.us"
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
    Prometheus,
    AlertManager,
}

pub struct GetServerURL_Options {
    pub force_localhost: bool,
    pub force_https: bool,
}

// sync:js (along with constants above)
pub fn get_server_url(server_pod: ServerPod, subpath: &str, claimed_client_url_str: Option<String>, opts: GetServerURL_Options) -> Result<String, Error> {
    let DomainsConstants { prod_domain, recognized_web_server_hosts, on_server_and_dev, on_server_and_prod: _ } = DomainsConstants::new();
    
	//const opts = {...new GetServerURL_Options(), ...options};
	assert!(subpath.starts_with("/"));

	println!("GetServerURL_claimedClientURLStr: {:?}", claimed_client_url_str);
	let claimed_client_url = claimed_client_url_str.map(|str| Url::parse(&str).unwrap());
	//const origin = referrerURL?.origin;

	let mut server_url: Url;

	// section 1: set protocol and hostname
	// ==========

	// if there is a client-url, and its host is recognized (OR on app-server pod running with DEV), trust that host as being the server host
	if let Some(claimed_client_url) = claimed_client_url.as_ref() {
		if recognized_web_server_hosts.contains(&claimed_client_url.host_str().unwrap()) || on_server_and_dev {
			server_url = Url::parse(&format!("{}//{}", claimed_client_url.scheme(), claimed_client_url.host_str().unwrap())).unwrap();
		}
		// else, just guess at the correct origin
		else {
			//Assert(webServerHosts.includes(referrerURL.host), `Client sent invalid referrer host (${referrerURL.host}).`);
			let guessed_to_be_local = opts.force_localhost || on_server_and_dev;
			if guessed_to_be_local {
				//webServerURL = new URL("http://localhost:5100");
				server_url = Url::parse("http://localhost").unwrap(); // port to be set shortly (see section below)
			} else {
				server_url = Url::parse(&format!("https://{}", prod_domain)).unwrap();
			}
		}
	} else {
		//Assert(webServerHosts.includes(referrerURL.host), `Client sent invalid referrer host (${referrerURL.host}).`);
		let guessed_to_be_local = opts.force_localhost || on_server_and_dev;
		if guessed_to_be_local {
			//webServerURL = new URL("http://localhost:5100");
			server_url = Url::parse("http://localhost").unwrap(); // port to be set shortly (see section below)
		} else {
			server_url = Url::parse(&format!("https://{}", prod_domain))?;
        }
    }
    
    // section 2: set subdomain/port
    // ==========

    match server_pod {
        ServerPod::WebServer => {
            if server_url.host_str().unwrap() == "localhost" {
                server_url.set_port(match claimed_client_url.as_ref().unwrap().port() {
                    Some(5100) => Some(5100),
                    Some(5101) => Some(5101),
                    _ => Some(5100),
                }).unwrap();
            } else {
                // no need to change; web-server is the base-url, in production (ie. no subdomain/port)
            }
        },
        ServerPod::AppServer => {
            if server_url.host_str().unwrap() == "localhost" {
                server_url.set_port(Some(5110)).unwrap();
            } else {
                server_url.set_host(Some(&format!("app-server.{}", server_url.host_str().unwrap())))?;
            }
        },
        ServerPod::Monitor => {
            if server_url.host_str().unwrap() == "localhost" {
                server_url.set_port(match claimed_client_url.as_ref().unwrap().port() {
                    Some(5130) => Some(5130),
                    Some(5131) => Some(5131),
                    _ => Some(5130),
                }).unwrap();
            } else {
                server_url.set_host(Some(&format!("monitor.{}", server_url.host_str().unwrap())))?;
            }
        },
        ServerPod::Grafana => {
            if server_url.host_str().unwrap() == "localhost" {
                server_url.set_port(Some(3000)).unwrap();
            } else {
                server_url.set_host(Some(&format!("grafana.{}", server_url.host_str().unwrap())))?;
            }
        },
        ServerPod::Prometheus => {
            if server_url.host_str().unwrap() == "localhost" {
                server_url.set_port(Some(9090)).unwrap();
            } else {
                server_url.set_host(Some(&format!("prometheus.{}", server_url.host_str().unwrap())))?;
            }
        },
        ServerPod::AlertManager => {
            if server_url.host_str().unwrap() == "localhost" {
                server_url.set_port(Some(9093)).unwrap();
            } else {
                server_url.set_host(Some(&format!("alertmanager.{}", server_url.host_str().unwrap())))?;
            }
        },
    }

    // section 3: set path
    // ==========

    server_url.set_path(subpath);

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