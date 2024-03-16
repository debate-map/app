import {Assert} from "web-vcore/nm/js-vextensions.js";

// sync:rs
// ==========

const domainConstants = {
	prodDomain: "debatemap.app",
	recognizedWebServerHosts: [
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
	// since in client code, these are always false (vars are kept to match server code)
	onServerAndDev: false,
	onServerAndProd: false,
};

export type ServerPod = "web-server" | "app-server" | "monitor" | "grafana";
export type GetServerURL_Options = {
	claimedClientURL: string|n,
	restrictToRecognizedHosts: boolean,

	forceLocalhost?: boolean,
	forceHTTPS?: boolean,
};

export function GetServerURL(serverPod: ServerPod, subpath: string, opts: GetServerURL_Options) {
	Assert(subpath.startsWith("/"));

	// process claimed-client-url
	const claimedClientURL = opts.claimedClientURL ? new URL(opts.claimedClientURL) : null;
	const shouldTrustClaimedClientURL = claimedClientURL != null
		? !opts.restrictToRecognizedHosts || domainConstants.recognizedWebServerHosts.includes(claimedClientURL.host) || domainConstants.onServerAndDev
		: false;
	const claimedClientURL_trusted = shouldTrustClaimedClientURL ? claimedClientURL : null;

	let serverURL: URL;

	// section 1: set protocol and hostname
	// ==========

	if (claimedClientURL_trusted != null) {
		const portStr = claimedClientURL_trusted.port ? `:${claimedClientURL_trusted.port}` : "";
		serverURL = new URL(`${claimedClientURL_trusted.protocol}//${claimedClientURL_trusted.hostname}${portStr}`);
	} else {
		// if we don't have a claimed-client-url that we can trust, then just guess at the correct origin
		//Assert(webServerHosts.includes(referrerURL.host), `Client sent invalid referrer host (${referrerURL.host}).`);
		const guessedToBeLocal = opts.forceLocalhost || domainConstants.onServerAndDev;
		if (guessedToBeLocal) {
			serverURL = new URL("http://localhost:5100"); // standard local-k8s entry-point
		} else {
			serverURL = new URL(`https://${domainConstants.prodDomain}`);
		}
	}

	// section 2: set subdomain/port
	// ==========

	// for simply deciding between localhost:5100 and localhost:5101, we don't need the claimed-client-url to be "trusted"
	if (serverPod == "web-server" && claimedClientURL?.port == "5101") {
		serverURL.port = "5101";
	}

	// section 3: set path
	// ==========

	Assert(subpath.startsWith("/"), "Subpath must start with a forward-slash.");
	let subpathFinal = subpath;
	if (serverPod == "app-server") {
		subpathFinal = `/app-server${subpathFinal}`;
	} else if (serverPod == "monitor") {
		subpathFinal = `/monitor${subpathFinal}`;
	} else if (serverPod == "grafana") {
		subpathFinal = `/grafana${subpathFinal}`;
	}
	serverURL.pathname = subpathFinal;

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