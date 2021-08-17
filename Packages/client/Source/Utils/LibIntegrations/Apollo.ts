import {store} from "Store";
import {RunInAction} from "web-vcore";
import {ApolloClient, ApolloLink, FetchResult, from, gql, HttpLink, InMemoryCache, NormalizedCacheObject, split} from "web-vcore/nm/@apollo/client.js";
import {WebSocketLink, getMainDefinition, onError} from "web-vcore/nm/@apollo/client_deep.js";
import {Assert} from "web-vcore/nm/js-vextensions";
import {runInAction} from "web-vcore/nm/mobx";
import {GetTypePolicyFieldsMappingSingleDocQueriesToCache} from "web-vcore/nm/mobx-graphlink.js";
import {graph} from "./MobXGraphlink";

export function GetWebServerURL(subpath: string) {
	Assert(subpath.startsWith("/"));
	if (location.host == "localhost:3005") return subpath;
	if (location.host == "localhost:31005") return subpath; // because of tilt-proxy, this usually isn't needed, but keeping for raw access
	return `https://debatemap.app/${subpath.slice(1)}`;
}
export function GetDBServerURL(subpath: string) {
	Assert(subpath.startsWith("/"));
	if (location.host == "localhost:3005") return `http://localhost:3105/${subpath.slice(1)}`;
	if (location.host == "localhost:31005") return `http://localhost:31006/${subpath.slice(1)}`; // because of tilt-proxy, this usually isn't needed, but keeping for raw access
	return `https://app-server.debatemap.app/${subpath.slice(1)}`;
}

const GRAPHQL_URL = GetDBServerURL("/graphql");

let httpLink: HttpLink;
let wsLink: WebSocketLink;
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
	wsLink = new WebSocketLink({
		uri: GRAPHQL_URL.replace(/^http/, "ws"),
		options: {
			reconnect: true,
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
			},
		}),
	});

	// right at start, we need to associate our user-id with our websocket-connection (so server can grant access to user-specific data); we do this using the hack below
	(async()=>{
		const fetchResult = await apolloClient.mutate({
			mutation: gql`
				mutation _GetConnectionID {
					_GetConnectionID {
						id
					}
				}
			`,
			//variables: this.payload,
		});
		const result = fetchResult.data["_GetConnectionID"];
		const connectionID = result.id;
		console.log("Got connection id:", connectionID);

		// associate connection-id with websocket-connection
		const fetchResult2_subscription = await apolloClient.subscribe({
			query: gql`
				subscription _PassConnectionID($connectionID: String) {
					_PassConnectionID(connectionID: $connectionID) {
						userID
					}
				}
			`,
			variables: {connectionID},
		});
		const fetchResult2 = await new Promise<FetchResult<any>>(resolve=>{
			const subscription = fetchResult2_subscription.subscribe(data=>{
				subscription.unsubscribe(); // unsubscribe as soon as first (and only) result is received
				resolve(data);
			});
		});
		const result2 = fetchResult2.data["_PassConnectionID"];
		const userID = result2.userID;
		console.log("After passing connection id, got user id:", userID);

		//apolloSignInPromise_resolve({userID});
		RunInAction("ApolloSignInDone", ()=>{
			/*store.main.userID_apollo = userID;
			store.main.userID_apollo_ready = true;*/
			// rather than getting user-id from cookie, get it from the server's websocket-helper response
			if (graph.userInfo == null) {
				graph.SetUserInfo({
					//id: store.main.userID_apollo!,
					id: userID,
				});
			}
		});
	})();

	//return {userID};
}

/*let apolloSignInPromise_resolve;
export const apolloSignInPromise = new Promise<{userID: string}>(resolve=>{
	apolloSignInPromise_resolve = resolve;
});*/