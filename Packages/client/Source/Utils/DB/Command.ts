import {Term} from "dm_common";
import {apolloClient} from "Utils/LibIntegrations/Apollo";
import {gql} from "web-vcore/nm/@apollo/client";

export async function RunCommand_AddTerm(commandArgs: {term: Term}) {
	const result = await apolloClient.mutate({
		mutation: gql`
			mutation($term: TermInput!) {
				AddTerm(term: $term) {
					id
				}
			}
		`,
		variables: commandArgs,
	});
	console.log("Add-term result:", result);
	return result.data.AddTerm as {id: string};
}