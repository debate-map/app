import {ApolloClient, ApolloLink, from, HttpLink, InMemoryCache, NormalizedCacheObject, split} from "web-vcore/nm/@apollo/client.js";
import {GetTypePolicyFieldsMappingSingleDocQueriesToCache} from "web-vcore/nm/mobx-graphlink.js";

// @ts-ignore // temp fix for import error
//import {WebSocketLink, getMainDefinition, onError} from "web-vcore/nm/@apollo/client_deep_cjs.js";
import {WebSocketLink, getMainDefinition, onError} from "web-vcore/nm/@apollo/client_deep.js";

const GRAPHQL_URL = "http://localhost:3105/graphql";

let httpLink: HttpLink;
let wsLink: WebSocketLink;
let link: ApolloLink;
let link_withErrorHandling: ApolloLink;
export let apolloClient: ApolloClient<NormalizedCacheObject>;

export function InitApollo(serverLaunchID: string) {
	httpLink = new HttpLink({
		uri: GRAPHQL_URL,
	});
	wsLink = new WebSocketLink({
		uri: GRAPHQL_URL.replace(/^http/, "ws"),
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