import {Assert} from "web-vcore/nm/js-vextensions.js";

/*const recognizedWebServerHosts = [
	"localhost:5100", "localhost:5101", // web-server, dev/local
	"localhost:5130", "localhost:5131", // monitor, dev/local
	"debatemap.app",
	"debates.app",
	"debating.app",
	"9m2x1z.nodes.c1.or1.k8s.ovh.us",
];*/
const prodDomain = "debatemap.app";
//const prodDomain = "debates.app"; // temp

/*function AsPartial<T>(defaultOpts: T): Partial<T> {
	return defaultOpts;
}*/

//const ON_SERVER = globalThis.process?.env?.ENV != null;
//const ON_SERVER_AND_DEV = ON_SERVER && process.env.ENV == "dev";
//const ON_SERVER_AND_PROD = ON_SERVER && process.env.ENV == "prod";

export type ServerPod = "web-server" | "app-server" | "monitor" | "grafana";

/*export class GetServerURL_Options {
	forceLocalhost = false;
	forceHTTPS = false;
}*/
// sync:rs (along with constants above)
export function GetServerURL(serverPod: ServerPod, subpath: string, claimedClientURLStr: string|n, opts = {} as {forceLocalhost?: boolean, forceHTTPS?: boolean}) {
	//const opts = {...new GetServerURL_Options(), ...options};
	Assert(subpath.startsWith("/"));

	//console.log("GetServerURL_claimedClientURLStr:", claimedClientURLStr);
	const claimedClientURL = claimedClientURLStr ? new URL(claimedClientURLStr) : null;
	//const origin = referrerURL?.origin;

	let serverURL: URL;

	// section 1: set protocol and hostname
	// ==========

	// if there is a client-url, and its host is recognized (OR on app-server pod running with DEV), trust that host as being the server host
	//if (claimedClientURL && (recognizedWebServerHosts.includes(claimedClientURL.host) || ON_SERVER_AND_DEV)) {
	if (claimedClientURL) {
		const portStr = claimedClientURL.port ? `:${claimedClientURL.port}` : "";
		serverURL = new URL(`${claimedClientURL.protocol}//${claimedClientURL.hostname}${portStr}`);
	}
	// else, just guess at the correct origin
	else {
		//Assert(webServerHosts.includes(referrerURL.host), `Client sent invalid referrer host (${referrerURL.host}).`);
		const guessedToBeLocal = opts.forceLocalhost;
		if (guessedToBeLocal) {
			//webServerURL = new URL("http://localhost:5100");
			serverURL = new URL("http://localhost"); // port to be set shortly (see section below)
		} else {
			serverURL = new URL(`https://${prodDomain}`);
		}
	}

	// section 2: set subdomain/port
	// ==========

	if (serverURL.hostname != "localhost") {
		serverURL.host = `${serverURL.host}`;
	}

	let pathPrefix = "";
	if (serverPod == "web-server") {
	} else if (serverPod == "app-server") {
		pathPrefix = "/app-server";
	} else if (serverPod == "monitor") {
		pathPrefix = "/monitor";
	} else if (serverPod == "grafana") {
		pathPrefix = "/grafana";
	}

	// section 3: set path
	// ==========

	serverURL.pathname = pathPrefix + subpath;

	// section 4: special-case handling
	// ==========

	// if this app-server is PROD, but we have a "localhost" host, user must be using the "?db=prod" flag
	/*if (ON_SERVER_AND_PROD && (claimedClientURL?.host == "localhost:5100" || claimedClientURL?.host == "localhost:5101")) {
		if (subpath == "/auth/google/callback") {
			subpath = "/auth/google/callback_returnToLocalhost";
			serverURL.pathname = subpath;
		}
	}*/

	if (opts.forceHTTPS) {
		serverURL.protocol = "https:";
	}

	return serverURL.toString();
}