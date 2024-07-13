import {store} from "Store";
import {Client, createClient} from "graphql-ws";
import {RunInAction} from "web-vcore";
import {ApolloClient, ApolloLink, DefaultOptions, FetchResult, from, gql, HttpLink, InMemoryCache, NormalizedCacheObject, split} from "@apollo/client";
import {getMainDefinition} from "@apollo/client/utilities/index.js";
import {WebSocketLink} from "@apollo/client/link/ws/index.js";
import {GraphQLWsLink} from "@apollo/client/link/subscriptions/index.js";
import {onError} from "@apollo/client/link/error/index.js";
import {Assert, Timer} from "js-vextensions";
import {GetTypePolicyFieldsMappingSingleDocQueriesToCache} from "mobx-graphlink";

export function GetAppServerURL(subpath: string): string {
	Assert(subpath.startsWith("/"));
	if (ENV == "dev" || location.host == "localhost:5100" || location.host.startsWith("localhost:513")) {
		//return `http://localhost:5130/${subpath.slice(1)}`;
		return `http://localhost:5100/monitor/${subpath.slice(1)}`;
	}
	if (ENV == "prod") {
		return `https://debatemap.app/monitor/${subpath.slice(1)}`;
	}
	Assert(false, `Invalid env specified:${ENV}`);
}

const GRAPHQL_URL = GetAppServerURL("/graphql");

let httpLink: HttpLink;
let wsClient: Client;
let wsClient_connectCount = 0;
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
				//AttachUserJWTToWebSocketConnection();
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
			const {graphQLErrors, networkError, response, operation, forward} = info;
			if (graphQLErrors) {
				graphQLErrors.forEach(({message, locations, path})=>{
					console.error(`[GraphQL error] @message:`, message, "@locations:", locations, "@path:", path, "@response:", response, "@operation", JSON.stringify(operation));
				});
			}

			if (networkError) console.error(`[Network error]: ${networkError}`, "@response:", response, "@operation", JSON.stringify(operation));
		}),
		link,
	]);
	apolloClient = new ApolloClient({
		//credentials: "include", // allows cookies to be sent with "graphql" calls (eg. for passing passportjs session-token with mutation/command calls) // this way doesn't work, I think because we send a custom "link"
		//link,
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
				// temp fix for: https://github.com/apollographql/apollo-client/issues/8677#issuecomment-925661998
				Map: {
					fields: {
						featured(rawVal: boolean, {args}) { return rawVal ?? null; },
						note(rawVal: string, {args}) { return rawVal ?? null; },
					},
				},
			},
		}),
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