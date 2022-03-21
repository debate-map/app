import {store} from "Store";
import {SubscriptionClient} from "subscriptions-transport-ws";
import {RunInAction} from "web-vcore";
import {ApolloClient, ApolloLink, FetchResult, from, gql, HttpLink, InMemoryCache, NormalizedCacheObject, split} from "web-vcore/nm/@apollo/client.js";
import {getMainDefinition, onError, WebSocketLink} from "web-vcore/nm/@apollo/client_deep.js";
import {Assert, Timer} from "web-vcore/nm/js-vextensions";
import {GetTypePolicyFieldsMappingSingleDocQueriesToCache} from "web-vcore/nm/mobx-graphlink.js";

export function GetAppServerURL(subpath: string): string {
	Assert(subpath.startsWith("/"));
	if (ENV == "development") return `http://localhost:5130/${subpath.slice(1)}`;
	if (ENV == "production") return `https://monitor.debates.app/${subpath.slice(1)}`;
	Assert(false, `Invalid env specified:${ENV}`);
}

const GRAPHQL_URL = GetAppServerURL("/graphql");

let httpLink: HttpLink;
let wsClient: SubscriptionClient;
let wsClient_connectCount = 0;
let wsLink: WebSocketLink;
let link: ApolloLink;
let link_withErrorHandling: ApolloLink;
export let apolloClient: ApolloClient<NormalizedCacheObject>;

export function InitApollo() {
	httpLink = new HttpLink({
		uri: GRAPHQL_URL,
		// allows cookies to be sent with "graphql" calls (eg. for passing passportjs session-token with mutation/command calls)
		/*fetchOptions: {
			credentials: "include",
		},*/
	});

	wsClient = new SubscriptionClient(GRAPHQL_URL.replace(/^http/, "ws"), {
		reconnect: true,
	});
	// could also detect general web dc/rc (https://developer.mozilla.org/en-US/docs/Web/API/Navigator/Online_and_offline_events), but doesn't seem necessary
	wsClient.onConnected(()=>{
		wsClient_connectCount++;
		console.log(`WebSocket connected. (count: ${wsClient_connectCount})`);
		RunInAction("wsClient.onConnected", ()=>store.main.webSocketConnected = true);

		// right at start, we need to associate our user-id with our websocket-connection (so server can grant access to user-specific data)
		//AuthenticateWebSocketConnection();
	});
	wsClient.onReconnected(()=>{
		wsClient_connectCount++;
		console.log(`WebSocket reconnected. (count: ${wsClient_connectCount})`);
		RunInAction("wsClient.onReconnected", ()=>store.main.webSocketConnected = true);

		// whenever our web-socket reconnects, we have to authenticate the new websocket connection
		//AuthenticateWebSocketConnection();
	});
	wsClient.onReconnecting(()=>{
		console.log("WebSocket reconnecting.");
		//RunInAction("wsClient.onReconnecting", ()=>store.main.webSocketConnected = false);
	});
	wsClient.onDisconnected(()=>{
		// only log the "disconnection" if this is the first one, or we know it had actually been connected just prior (the WS "disconnects" each time a reconnect attempt is made)
		if (store.main.webSocketLastDCTime == null || store.main.webSocketConnected) {
			console.log("WebSocket disconnected.");
		}
		RunInAction("wsClient.onDisconnected", ()=>{
			store.main.webSocketConnected = false;
			store.main.webSocketLastDCTime = Date.now();
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
	});
}

export async function SendPingOverWebSocket() {
	const fetchResult_subscription = apolloClient.subscribe({
		query: gql`
			subscription {
				_Ping {
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

	const {pong, refreshPage} = fetchResult.data._Ping;
	if (refreshPage) {
		console.log("Refreshing page due to server request.");
		window.location.reload();
	}

	return fetchResult;
}