import {ApolloClient, ApolloLink, from, HttpLink, InMemoryCache, NormalizedCacheObject, split} from "web-vcore/nm/@apollo/client.js";
import {GetTypePolicyFieldsMappingSingleDocQueriesToCache} from "web-vcore/nm/mobx-graphlink.js";

// @ts-ignore // temp fix for import error
//import {WebSocketLink, getMainDefinition, onError} from "web-vcore/nm/@apollo/client_deep_cjs.js";
import {WebSocketLink, getMainDefinition, onError} from "web-vcore/nm/@apollo/client_deep.js";
import {Assert} from "web-vcore/nm/js-vextensions";

const recognizedWebServerHosts = ["localhost:3005", "localhost:3055", "debatemap.app", "debates.app"];
//const prodDomain = "debatemap.app";
const prodDomain = "debates.app"; // temp

const DEV = process.env.ENV == "dev";
const inK8s = process.env.KUBERNETES_SERVICE_HOST != null;
//const inK8s = process.env.DB_ADDR;

export function GetWebServerURL(subpath: string, referrerURLStr: string|n, forceLocalhost = false) {
	Assert(subpath.startsWith("/"));

	console.log("GetWebServerURL_referrer:", referrerURLStr);
	const referrerURL = referrerURLStr ? new URL(referrerURLStr) : null;
	//const origin = referrerURL?.origin;

	let webServerURL: URL;
	// if there is a referrer-url, and its host is recognized (OR app-server is DEV), trust that host as being the web-server host
	if (referrerURL && (recognizedWebServerHosts.includes(referrerURL.host) || DEV)) {
		webServerURL = referrerURL;
	}
	// else, just guess at the correct origin
	else {
		//Assert(webServerHosts.includes(referrerURL.host), `Client sent invalid referrer host (${referrerURL.host}).`);
		const guessedToBeLocal = forceLocalhost || DEV;
		if (guessedToBeLocal) {
			//webServerURL = new URL("http://localhost:3005");
			webServerURL = new URL("http://localhost:3055");
		} else {
			webServerURL = new URL(`https://${prodDomain}`);
		}
	}

	webServerURL.pathname = subpath;

	return webServerURL.toString();
}
export function GetAppServerURL(subpath: string, referrerURLStr: string|n) {
	Assert(subpath.startsWith("/"));

	if (DEV) return `http://localhost:3105/${subpath.slice(1)}`;

	// if this app-server is PROD, it can connect to either the production frontend, or a localhost frontend (if url has "?db=prod")
	console.log("GetAppServerURL_referrer:", referrerURLStr);
	const referrerURL = referrerURLStr ? new URL(referrerURLStr) : null;
	// this handling is needed for the "?db=prod" helper
	if (referrerURL && recognizedWebServerHosts.includes(referrerURL.host)) {
		//Assert(webServerHosts.includes(referrerURL.host), `Client sent invalid referrer host (${referrerURL.host}).`);

		// this branch is only hit if the app-server is PROD, thus if we hit a "localhost:3005" host, it must have the "?db=prod" flag
		if (referrerURL.host == "localhost:3005" || referrerURL.host == "localhost:3055") {
			if (subpath == "/auth/google/callback") {
				subpath = "/auth/google/callback_returnToLocalhost";
			}
		}
	}

	return `https://app-server.${prodDomain}/${subpath.slice(1)}`;
}

//const GRAPHQL_URL = GetDBServerURL("/graphql");
const GRAPHQL_URL = "http://localhost:3155/graphql"; // use the internal ip, not the external one

let httpLink: HttpLink;
let wsLink: WebSocketLink;
let link: ApolloLink;
let link_withErrorHandling: ApolloLink;
export let apolloClient: ApolloClient<NormalizedCacheObject>;

export function InitApollo(serverLaunchID: string) {
	console.log("Connecting app-server's Apollo client to:", GRAPHQL_URL);
	httpLink = new HttpLink({
		uri: GRAPHQL_URL,
	});
	wsLink = new WebSocketLink({
		uri: GRAPHQL_URL.replace(/^http/, "ws"), // upgrade to wss?
		options: {
			reconnect: true,
			//lazy: true, // needed for async connectionParams()
			connectionParams: ()=>{
				return {
					// needed so postgraphile knows this is the server-to-server websocket connection (for some reason, the param key needs to exactly be "authorization")
					authorization: serverLaunchID,
					/*headers: {
						//serverLaunchID, // needed so postgraphile knows this is the server-to-server websocket connection
						Authorization: serverLaunchID,
					},
					serverLaunchID, // same; test
					token: serverLaunchID,*/
				};
			},
		},
	});

	// using the ability to split links, you can send data to each link depending on what kind of operation is being sent
	link = split(
		// split based on operation type
		({query})=>{
			const definition = getMainDefinition(query);
			return (
				definition.kind === "OperationDefinition" &&
				definition.operation === "subscription"
			);
		},
		wsLink,
		httpLink,
	);
	link_withErrorHandling = from([
		onError(info=>{
			const {graphQLErrors, networkError, response, operation, forward} = info;
			if (graphQLErrors) {
				graphQLErrors.forEach(({message, locations, path})=>{
					console.error(`[GraphQL error] @message:`, message, "@locations:", locations, "@path:", path, "@response:", response, "@operation", operation);
				});
			}

			if (networkError) console.error(`[Network error]: ${networkError}`, "@response:", response, "@operation", operation);
		}),
		link,
	]);
	apolloClient = new ApolloClient({
		link: link_withErrorHandling,
		cache: new InMemoryCache({
			//dataIdFromObject: a=>a.nodeId as string ?? null,
			dataIdFromObject: a=>a.id as string ?? null,
			typePolicies: {
				Query: {
					fields: {
						...GetTypePolicyFieldsMappingSingleDocQueriesToCache(),
					},
				},
			},
		}),
	});
}