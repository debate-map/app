import {Term} from "dm_common";
import {apolloClient} from "Utils/LibIntegrations/Apollo";
import {gql} from "web-vcore/nm/@apollo/client";

export async function RunCommand_AddTerm(commandArgs: {term: Term}) {
	const result = await apolloClient.mutate({
		mutation: gql`
			mutation($input: AddTermInput!) {
				addTerm(input: $input) {
					id
				}
			}
		`,
		variables: {input: commandArgs},
	});
	console.log("Add-term result:", result);
	return result.data.addTerm as {id: string};
}