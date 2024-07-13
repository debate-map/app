import {setContext} from "@apollo/client/link/context";
import {GetServerURL, GetServerURL_Options} from "dm_common";
import {Client, createClient} from "graphql-ws";
import {store} from "Store";
import {GetUserInfoJWTString, SendUserJWTToMGL} from "Utils/AutoRuns/UserInfoCheck.js";
import {RunInAction} from "web-vcore";
import {ApolloClient, ApolloError, ApolloLink, DefaultOptions, FetchResult, from, gql, HttpLink, NormalizedCacheObject, split} from "@apollo/client";
import {getMainDefinition} from "@apollo/client/utilities/index.js";
import {GraphQLWsLink} from "@apollo/client/link/subscriptions/index.js";
import {onError} from "@apollo/client/link/error/index.js";
import {VoidCache} from "./Apollo/VoidCache.js";

export function GetPageOrigin_WithWebpackToK8sRetargeting() {
	let pageOrigin_targetingK8sCluster = window.location.origin;
	// if on localhost, but one of the webpack ports, change the port to target the k8s entry-point (webpack knows nothing of the app-server)
	if (window.location.hostname == "localhost" && (window.location.port == "5101" || window.location.port == "5131")) {
		pageOrigin_targetingK8sCluster = `${window.location.protocol}//${window.location.hostname}:5100`;
	}
	return pageOrigin_targetingK8sCluster;
}

export function GetWebServerURL(subpath: string, preferredServerOrigin?: string, opts?: GetServerURL_Options) {
	opts = {...{claimedClientURL: preferredServerOrigin ?? window.location.origin, restrictToRecognizedHosts: false}, ...opts};
	return GetServerURL("web-server", subpath, opts);
}
export function GetAppServerURL(subpath: string, preferredServerOrigin?: string, opts?: GetServerURL_Options): string {
	opts = {...{claimedClientURL: preferredServerOrigin ?? GetPageOrigin_WithWebpackToK8sRetargeting(), restrictToRecognizedHosts: false}, ...opts};
	// if we're trying to connect to the prod app-server, be consistent and just always use the OVH origin domain (we want to avoid reaching the Cloudflare proxy limit for websocket connections)
	if (DB == "prod") {
		return `https://9m2x1z.nodes.c1.or1.k8s.ovh.us/app-server/${subpath.slice(1)}`;
	}
	return GetServerURL("app-server", subpath, opts);
}
export function GetMonitorURL(subpath: string, preferredServerOrigin?: string, opts?: GetServerURL_Options): string {
	opts = {...{claimedClientURL: preferredServerOrigin ?? GetPageOrigin_WithWebpackToK8sRetargeting(), restrictToRecognizedHosts: false}, ...opts};
	return GetServerURL("monitor", subpath, opts);
}

const GRAPHQL_URL = GetAppServerURL("/graphql");
// for graphql/websocket connections, bypass cloudflare-cdn (ie. debates.app) and connect directly to the server cluster (ie. debating.app)
// (the cdn is nice for caching the static files, but for live data transfer, it has no value -- so direct is better, eg. to avoid cloudflare's websocket timeouts)
//const GRAPHQL_URL = GetAppServerURL("/graphql", "debating.app");

let httpLink: HttpLink;
let wsClient: Client;
export let wsClient_connectCount = 0; // export, so can check with console command
let wsLink: GraphQLWsLink;
let link: ApolloLink;
let link_withErrorHandling: ApolloLink;
export let apolloClient: ApolloClient<NormalizedCacheObject>;

export function InitApollo() {
	httpLink = new HttpLink({
		uri: GRAPHQL_URL,
		// allows cookies to be sent with "graphql" calls (eg. for passing passportjs session-token with mutation/command calls)
		fetchOptions: {
			credentials: "include",
		},
	});

	wsClient = createClient({
		url: GRAPHQL_URL.replace(/^http/, "ws"),
		/*reconnect:
			(startURL.GetQueryVar("ws_rc") == "0" ? false : null) ?? // for testing
			true,*/
		retryAttempts: Number.MAX_SAFE_INTEGER,
		on: {
			// could also detect general web dc/rc (https://developer.mozilla.org/en-US/docs/Web/API/Navigator/Online_and_offline_events), but doesn't seem necessary
			connected: ()=>{
				wsClient_connectCount++;
				console.log(`WebSocket connected. (count: ${wsClient_connectCount})`);
				RunInAction("wsClient.onConnected", ()=>store.wvc.webSocketConnected = true);

				// right at start, we need to associate our user-id with our websocket-connection (so server can grant access to user-specific data)
				AttachUserJWTToWebSocketConnection();
			},
			/*()=>{
				wsClient_connectCount++;
				console.log(`WebSocket reconnected. (count: ${wsClient_connectCount})`);
				RunInAction("wsClient.onReconnected", ()=>store.wvc.webSocketConnected = true);

				// whenever our web-socket reconnects, we have to authenticate the new websocket connection
				AttachUserJWTToWebSocketConnection();
			},*/
			connecting: ()=>{
				console.log("WebSocket connecting.");
				//RunInAction("wsClient.onReconnecting", ()=>store.wvc.webSocketConnected = false);
			},
			opened: ()=>{
				console.log("WebSocket opened.");
			},
			closed: (event: CloseEvent)=>{
				// only log the "disconnection" if this is the first one, or we know it had actually been connected just prior (the WS "disconnects" each time a reconnect attempt is made)
				if (store.wvc.webSocketLastDCTime == null || store.wvc.webSocketConnected) {
					console.log("WebSocket disconnected. @code:", event.code, "@reason:", event.reason);
				}
				RunInAction("wsClient.onDisconnected", ()=>{
					store.wvc.webSocketConnected = false;
					store.wvc.webSocketLastDCTime = Date.now();
				});
			},
			error: (error: any)=>console.error("WebSocket error:", error?.message ?? error),
		},
	});
	wsLink = new GraphQLWsLink(wsClient);

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
					if (graphQLErrors?.[0]?.["ignoreInGlobalGQLErrorHandler"]) return;

					for (const err of graphQLErrors) {
						const {message, locations, path} = err;
						console.error(`[GraphQL error] @message:`, message, "@locations:", locations, "@path:", path, "@response:", response, "@operation", JSON.stringify(operation));
					}
				}

				if (networkError) console.error(`[Network error]: ${networkError}`, "@response:", response, "@operation", JSON.stringify(operation));
			});
		}),
		setContext((_, {headers})=>{
			// get the authentication token from local storage if it exists
			const token = GetUserInfoJWTString();
			const finalHeaders = {...headers};
			// only attach the "authorization" header if there's a valid token to place there (otherwise server will error)
			if (token) finalHeaders["authorization"] = `Bearer ${token}`;
			// return the headers to the context so httpLink can read them
			return {
				headers: finalHeaders,
			};
		}),
		link,
	]);
	apolloClient = new ApolloClient({
		//credentials: "include", // allows cookies to be sent with "graphql" calls (eg. for passing passportjs session-token with mutation/command calls) // this way doesn't work, I think because we send a custom "link"
		link: link_withErrorHandling,
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
				const innerError = err.graphQLErrors?.[0]; // ts-def lies; graphQLErrors is null in some cases!
				if (innerError) innerError["ignoreInGlobalGQLErrorHandler"] = true;

				console.error(`Error attaching auth-data jwt to websocket connection; you'll likely need to sign-in again. This is likely benign, eg. when changing the "?db=[dev/prod]" url-flag. @error:`, err);
				//if (innerError) SendErrorToSentry(innerError);
			},
		);
	});
	console.log("Tried attaching auth-data jwt to websocket connection. @success:", fetchResult.data.signInAttach.success);

	SendUserJWTToMGL();
}