import {ApolloClient, ApolloLink, from, HttpLink, InMemoryCache, NormalizedCacheObject, split} from "web-vcore/nm/@apollo/client";
import {WebSocketLink} from "web-vcore/nm/@apollo/client_deep";
import {getMainDefinition} from "web-vcore/nm/@apollo/client_deep";
import {onError} from "web-vcore/nm/@apollo/client_deep";
import {GetTypePolicyFieldsMappingSingleDocQueriesToCache} from "web-vcore/nm/mobx-graphlink";

const GRAPHQL_URL = "http://localhost:3105/graphql";

let httpLink: HttpLink;
let wsLink: WebSocketLink;
let link: ApolloLink;
let link_withErrorHandling: ApolloLink;
export let pgClient: ApolloClient<NormalizedCacheObject>;

export function InitPGLink() {
	httpLink = new HttpLink({
		uri: GRAPHQL_URL,
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
		onError(({graphQLErrors, networkError})=>{
			if (graphQLErrors) {
				graphQLErrors.forEach(({message, locations, path})=>{
					console.error(`[GraphQL error] @message:`, message, "@locations:", locations, "@path:", path);
				});
			}

			if (networkError) console.error(`[Network error]: ${networkError}`);
		}),
		link,
	]);
	pgClient = new ApolloClient({
		//link,
		link: link_withErrorHandling,
		cache: new InMemoryCache({
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