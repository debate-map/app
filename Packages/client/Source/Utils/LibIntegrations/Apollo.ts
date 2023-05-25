import {GetServerURL} from "dm_common";
import {store} from "Store";
import {SubscriptionClient} from "subscriptions-transport-ws";
import {HandleError, RunInAction, SendErrorToSentry} from "web-vcore";
import {ApolloClient, ApolloError, ApolloLink, DefaultOptions, FetchResult, from, gql, HttpLink, InMemoryCache, NormalizedCacheObject, split} from "web-vcore/nm/@apollo/client.js";
import {ErrorResponse, getMainDefinition, onError, WebSocketLink} from "web-vcore/nm/@apollo/client_deep.js";
import {Assert, Timer} from "web-vcore/nm/js-vextensions";
import {GetTypePolicyFieldsMappingSingleDocQueriesToCache} from "web-vcore/nm/mobx-graphlink.js";
import {setContext} from "@apollo/client/link/context";
import {GetUserInfoJWTString, OnUserJWTChanged, SendUserJWTToMGL} from "Utils/AutoRuns/UserInfoCheck.js";
import {graph} from "./MobXGraphlink.js";
import {VoidCache} from "./Apollo/VoidCache.js";

/*export function GetWebServerURL(subpath: string) {
	Assert(subpath.startsWith("/"));
	/*if (location.host == "localhost:5100") return subpath;
	if (location.host == "localhost:31005") return subpath; // because of tilt-proxy, this usually isn't needed, but keeping for raw access
	return `https://debatemap.app/${subpath.slice(1)}`;*#/
	return subpath;
}
export function GetAppServerURL(subpath: string): string {
	Assert(subpath.startsWith("/"));

	// temp
	/*if (location.host == "debates.app" || DB == "prod") return `https://app-server.debates.app/${subpath.slice(1)}`;

	if (location.host == "localhost:5100" || location.host == "localhost:5101") return `http://localhost:5110/${subpath.slice(1)}`;
	//if (location.host == "localhost:31005") return `http://localhost:31006/${subpath.slice(1)}`; // because of tilt-proxy, this usually isn't needed, but keeping for raw access

	// if we're in remote k8s, but accessing it from the raw cluster-url, just change the port
	//if (location.host.endsWith(":31005")) return `${location.protocol}//${location.host.replace(":31005", ":31006")}/${subpath.slice(1)}`;

	return `https://app-server.debatemap.app/${subpath.slice(1)}`;*#/

	if (DB == "dev") return `http://localhost:5110/${subpath.slice(1)}`;
	if (DB == "prod") {
		// maybe temp: for graphql/websocket to OVH host directly, use unencrypted http/ws rather than https/wss (since the server hasn't yet been set up with TLS itself)
		/*if (window.location.host.endsWith(".ovh.us") && subpath == "/graphql") {
			return `http://app-server.${window.location.host}/${subpath.slice(1)}`;
		}*#/

		//return `https://app-server.debates.app/${subpath.slice(1)}`;
		//return `https://app-server.${window.location.host}/${subpath.slice(1)}`;
		return `${window.location.protocol}//app-server.${window.location.host}/${subpath.slice(1)}`;
	}
	Assert(false, `Invalid database specified:${DB}`);
}*/

export function GetWebServerURL(subpath: string, preferredServerOrigin?: string) {
	return GetServerURL("web-server", subpath, preferredServerOrigin ?? window.location.origin);
}
export function GetAppServerURL(subpath: string, preferredServerOrigin?: string): string {
	// if on localhost, but user has set the db/server override to "prod", do so
	if (window.location.hostname == "localhost" && DB == "prod") {
		return `https://app-server.debatemap.app/${subpath.slice(1)}`;
	}

	return GetServerURL("app-server", subpath, preferredServerOrigin ?? window.location.origin);
}
export function GetMonitorURL(subpath: string, preferredServerOrigin?: string): string {
	return GetServerURL("monitor", subpath, preferredServerOrigin ?? window.location.origin);
}

const GRAPHQL_URL = GetAppServerURL("/graphql");
// for graphql/websocket connections, bypass cloudflare-cdn (ie. debates.app) and connect directly to the server cluster (ie. debating.app)
// (the cdn is nice for caching the static files, but for live data transfer, it has no value -- so direct is better, eg. to avoid cloudflare's websocket timeouts)
//const GRAPHQL_URL = GetAppServerURL("/graphql", "debating.app");

let httpLink: HttpLink;
let wsClient: SubscriptionClient;
export let wsClient_connectCount = 0; // export, so can check with console command
let wsLink: WebSocketLink;
let link: ApolloLink;
let link_withErrorHandling: ApolloLink;
export let apolloClient: ApolloClient<NormalizedCacheObject>;

/*function Test1() {
	const websocket = new WebSocket(GRAPHQL_URL.replace(/^http/, "ws"));
	websocket.onopen = ()=>{
		console.log("connection opened");
		//websocket.send(username.value);
	};
	websocket.onclose = ()=>console.log("connection closed");
	websocket.onmessage = e=>console.log(`received message: ${e.data}`);
	document.onclick = e=>websocket.send(`Hi:${Date.now()}`);
}*/

export function InitApollo() {
	httpLink = new HttpLink({
		uri: GRAPHQL_URL,
		// allows cookies to be sent with "graphql" calls (eg. for passing passportjs session-token with mutation/command calls)
		fetchOptions: {
			credentials: "include",
		},
	});

	wsClient = new SubscriptionClient(GRAPHQL_URL.replace(/^http/, "ws"), {
		reconnect:
			(startURL.GetQueryVar("ws_rc") == "0" ? false : null) ?? // for testing
			true,
	});
	// could also detect general web dc/rc (https://developer.mozilla.org/en-US/docs/Web/API/Navigator/Online_and_offline_events), but doesn't seem necessary
	wsClient.onConnected(()=>{
		wsClient_connectCount++;
		console.log(`WebSocket connected. (count: ${wsClient_connectCount})`);
		RunInAction("wsClient.onConnected", ()=>store.wvc.webSocketConnected = true);

		// right at start, we need to associate our user-id with our websocket-connection (so server can grant access to user-specific data)
		AttachUserJWTToWebSocketConnection();
	});
	wsClient.onReconnected(()=>{
		wsClient_connectCount++;
		console.log(`WebSocket reconnected. (count: ${wsClient_connectCount})`);
		RunInAction("wsClient.onReconnected", ()=>store.wvc.webSocketConnected = true);

		// whenever our web-socket reconnects, we have to authenticate the new websocket connection
		AttachUserJWTToWebSocketConnection();
	});
	wsClient.onReconnecting(()=>{
		console.log("WebSocket reconnecting.");
		//RunInAction("wsClient.onReconnecting", ()=>store.wvc.webSocketConnected = false);
	});
	wsClient.onDisconnected(()=>{
		// only log the "disconnection" if this is the first one, or we know it had actually been connected just prior (the WS "disconnects" each time a reconnect attempt is made)
		if (store.wvc.webSocketLastDCTime == null || store.wvc.webSocketConnected) {
			console.log("WebSocket disconnected.");
		}
		RunInAction("wsClient.onDisconnected", ()=>{
			store.wvc.webSocketConnected = false;
			store.wvc.webSocketLastDCTime = Date.now();
		});
	});
	wsClient.onError(error=>console.error("WebSocket error:", error.message));
	wsLink = new WebSocketLink(wsClient);

	// every 45s, send a "keepalive message" through the WS; this avoids Cloudflare's "100 seconds of dormancy" timeout (https://community.cloudflare.com/t/cloudflare-websocket-timeout/5865)
	// (we use a <60s interval, so that it will reliably hit each 60s timer-interval that Chrome 88+ allows for hidden pages: https://developer.chrome.com/blog/timer-throttling-in-chrome-88/#intensive-throttling)
	const keepAliveTimer = new Timer(45000, ()=>{
		SendPingOverWebSocket();
	}).Start();

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
			// wait a moment before processing, so that call-specific error-handling can be done first (and so it can set the "ignoreInGlobalGQLErrorHandler" field if desired)
			setTimeout(()=>{
				const {graphQLErrors, networkError, response, operation, forward} = info;

				if (graphQLErrors) {
					if (graphQLErrors[0]?.["ignoreInGlobalGQLErrorHandler"]) return;

					for (const err of graphQLErrors) {
						const {message, locations, path} = err;
						console.error(`[GraphQL error] @message:`, message, "@locations:", locations, "@path:", path, "@response:", response, "@operation", operation);
					}
				}

				if (networkError) console.error(`[Network error]: ${networkError}`, "@response:", response, "@operation", operation);
			});
		}),
		setContext((_, {headers})=>{
			// get the authentication token from local storage if it exists
			const token = GetUserInfoJWTString();
			// return the headers to the context so httpLink can read them
			return {
				headers: {
					...headers,
					authorization: token ? `Bearer ${token}` : "",
				},
			};
		}),
		link,
	]);
	apolloClient = new ApolloClient({
		//credentials: "include", // allows cookies to be sent with "graphql" calls (eg. for passing passportjs session-token with mutation/command calls) // this way doesn't work, I think because we send a custom "link"
		//link,
		link: link_withErrorHandling,
		/*cache: new InMemoryCache({
			//dataIdFromObject: a=>a.nodeId as string ?? null,
			dataIdFromObject: a=>a.id as string ?? null,
			typePolicies: {
				Query: {
					fields: {
						...GetTypePolicyFieldsMappingSingleDocQueriesToCache(),
					},
				},
				// temp fix for: https://github.com/apollographql/apollo-client/issues/8677#issuecomment-925661998
				Map: {
					fields: {
						featured(rawVal: boolean, {args}) { return rawVal ?? null; },
						note(rawVal: string, {args}) { return rawVal ?? null; },
					},
				},
			},
		}),*/
		// replace InMemoryCache with VoidCache, because even a "not used" InMemoryCache has significant overhead, for checking for cache matches and such (>1s over ~25s map-load)
		cache: new VoidCache(),
		// default to not using the cache (it does nothing for subscriptions, and often does *opposite* of what we want for queries [eg. search]; and even when wanted, it's better to explicitly set it)
		defaultOptions: {
			watchQuery: {
				fetchPolicy: "no-cache",
				errorPolicy: "ignore",
			},
			query: {
				fetchPolicy: "no-cache",
				errorPolicy: "all",
			},
		} as DefaultOptions,
	});

	// Websocket doesn't have auth-data attached quite yet (happens in onConnected/onReconnected), but send user-data to MGL immediately anyway.
	// While this has some confusion potential (eg. "user panel shows my name, but commands say auth-data missing"), it's arguably still better than the alternative (causing user to start a redundant sign-in).
	// Note also that, once the auth-data is attached, mobx-graphlink will clear its cache and redo its queries; in most cases this happens fast enough to not be annoying, but is worth noting.
	SendUserJWTToMGL();
}

export async function SendPingOverWebSocket() {
	const fetchResult_subscription = apolloClient.subscribe({
		query: gql`
			subscription {
				_ping {
					pong
					refreshPage
				}
			}
		`,
		variables: {},
	});
	const fetchResult = await new Promise<FetchResult<any>>(resolve=>{
		const subscription = fetchResult_subscription.subscribe(data=>{
			subscription.unsubscribe(); // unsubscribe as soon as first (and only) result is received
			resolve(data);
		});
	});
	//console.log("Got response to ping:", fetchResult);

	const {pong, refreshPage} = fetchResult.data._ping;
	if (refreshPage) {
		console.log("Refreshing page due to server request.");
		window.location.reload();
	}

	return fetchResult;
}

// todo: ensure that this request gets sent before any others, on the websocket connection (else those ones will fail)
export async function AttachUserJWTToWebSocketConnection() {
	// associate user-info jwt to websocket-connection, by calling the `signInAttach` endpoint
	const fetchResult_subscription = apolloClient.subscribe({
		query: gql`
			subscription($input: SignInAttachInput!) {
				signInAttach(input: $input) {
					success
				}
			}
		`,
		variables: {input: {
			jwt: GetUserInfoJWTString(),
		}},
		//errorPolicy: "ignore",
	});
	const fetchResult = await new Promise<FetchResult<any>>(resolve=>{
		const subscription = fetchResult_subscription.subscribe(
			data=>{
				subscription.unsubscribe(); // unsubscribe as soon as first (and only) result is received
				resolve(data);
			},
			// By providing an error-handler function, we prevent apollo from turning the gql-error into a "full-fledged error" -- which would trigger an on-screen error-message.
			// In this case, we don't want it to trigger an on-screen error-message, because the verification failure is likely benign. For example, it can happen when changing the "?db=[dev/prod]" url-flag.
			(err: ApolloError)=>{
				// tell global gql-error-handler (seen above) to not handle this error; that way we can provide a more helpful error-message here, without two errors being logged
				const innerError = err.graphQLErrors[0];
				if (innerError) innerError["ignoreInGlobalGQLErrorHandler"] = true;

				console.error(`Error attaching auth-data jwt to websocket connection; you'll likely need to sign-in again. This is likely benign, eg. when changing the "?db=[dev/prod]" url-flag. @error:`, err);
				//if (innerError) SendErrorToSentry(innerError);
			},
		);
	});
	console.log("Tried attaching auth-data jwt to websocket connection. @success:", fetchResult.data.signInAttach.success);

	SendUserJWTToMGL();
}