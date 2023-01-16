import {Assert} from "web-vcore/nm/js-vextensions.js";

const recognizedWebServerHosts = [
	"localhost:5100", "localhost:5101", // web-server, dev/local
	"localhost:5130", "localhost:5131", // monitor, dev/local
	"debatemap.app",
	"debates.app",
	"debating.app",
	"9m2x1z.nodes.c1.or1.k8s.ovh.us",
];
const prodDomain = "debatemap.app";
//const prodDomain = "debates.app"; // temp

/*function AsPartial<T>(defaultOpts: T): Partial<T> {
	return defaultOpts;
}*/

const ON_SERVER = globalThis.process?.env?.ENV != null;
const ON_SERVER_AND_DEV = ON_SERVER && process.env.ENV == "dev";
const ON_SERVER_AND_PROD = ON_SERVER && process.env.ENV == "prod";

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
	if (claimedClientURL && (recognizedWebServerHosts.includes(claimedClientURL.host) || ON_SERVER_AND_DEV)) {
		serverURL = new URL(`${claimedClientURL.protocol}//${claimedClientURL.hostname}`);
	}
	// else, just guess at the correct origin
	else {
		//Assert(webServerHosts.includes(referrerURL.host), `Client sent invalid referrer host (${referrerURL.host}).`);
		const guessedToBeLocal = opts.forceLocalhost || ON_SERVER_AND_DEV;
		if (guessedToBeLocal) {
			//webServerURL = new URL("http://localhost:5100");
			serverURL = new URL("http://localhost"); // port to be set shortly (see section below)
		} else {
			serverURL = new URL(`https://${prodDomain}`);
		}
	}

	// section 2: set subdomain/port
	// ==========

	if (serverPod == "web-server") {
		if (serverURL.hostname == "localhost") {
			serverURL.port = {5100: 5100, 5101: 5101}[claimedClientURL?.port as any] ?? "5100";
		} else {
			// no need to change; web-server is the base-url, in production (ie. no subdomain/port)
		}
	} else if (serverPod == "app-server") {
		if (serverURL.hostname == "localhost") {
			serverURL.port = "5110";
		} else {
			serverURL.host = `app-server.${serverURL.host}`;
		}
	} else if (serverPod == "monitor") {
		if (serverURL.hostname == "localhost") {
			//serverURL.port = {5130: 5130, 5131: 5131}[claimedClientURL?.port as any] ?? "5130";
			serverURL.port = "5130"; // always return the actual k8s pod (since caller may be intending a backend call)
		} else {
			serverURL.host = `monitor.${serverURL.host}`;
		}
	} else if (serverPod == "grafana") {
		if (serverURL.hostname == "localhost") {
			serverURL.port = "3000";
		} else {
			serverURL.host = `grafana.${serverURL.host}`;
		}
	}

	// section 3: set path
	// ==========

	serverURL.pathname = subpath;

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