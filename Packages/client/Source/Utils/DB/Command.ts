import {AccessPolicy, Term} from "dm_common";
import {apolloClient} from "Utils/LibIntegrations/Apollo";
import {gql} from "web-vcore/nm/@apollo/client";

export async function RunCommand_AddAccessPolicy(commandArgs: {policy: AccessPolicy}) {
	const result = await apolloClient.mutate({
		mutation: gql`
			mutation($input: AddAccessPolicyInput!) {
				addAccessPolicy(input: $input) {
					id
				}
			}
		`,
		variables: {input: commandArgs},
	});
	return result.data.addAccessPolicy as {id: string};
}

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
	return result.data.addTerm as {id: string};
}

export async function RunCommand_DeleteAccessPolicy(commandArgs: {id: string}) {
	const result = await apolloClient.mutate({
		mutation: gql`
			mutation($input: DeleteAccessPolicyInput!) {
				deleteAccessPolicy(input: $input) { __typename }
			}
		`,
		variables: {input: commandArgs},
	});
	return result.data.deleteAccessPolicy as {};
}

export async function RunCommand_DeleteTerm(commandArgs: {id: string}) {
	const result = await apolloClient.mutate({
		mutation: gql`
			mutation($input: DeleteTermInput!) {
				deleteTerm(input: $input) { __typename }
			}
		`,
		variables: {input: commandArgs},
	});
	return result.data.deleteTerm as {};
}

export async function RunCommand_UpdateAccessPolicy(commandArgs: {id: string, updates: Partial<AccessPolicy>}) {
	const result = await apolloClient.mutate({
		mutation: gql`
			mutation($input: UpdateAccessPolicyInput!) {
				updateAccessPolicy(input: $input) { __typename }
			}
		`,
		variables: {input: commandArgs},
	});
	return result.data.updateAccessPolicy as {};
}

export async function RunCommand_UpdateTerm(commandArgs: {id: string, updates: Partial<Term>}) {
	const result = await apolloClient.mutate({
		mutation: gql`
			mutation($input: UpdateTermInput!) {
				updateTerm(input: $input) { __typename }
			}
		`,
		variables: {input: commandArgs},
	});
	return result.data.updateTerm as {};
}