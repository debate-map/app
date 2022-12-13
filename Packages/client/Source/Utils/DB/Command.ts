import {AccessPolicy, NodeTag, Media, Share, Term} from "dm_common";
import {apolloClient} from "Utils/LibIntegrations/Apollo";
import {gql} from "web-vcore/nm/@apollo/client";

// standardized add/update/delete commands
// ==========

function CreateFunc_RunCommand_AddX<ResultShape = {id: string}, T = any>(classConstructor: new(..._)=>T, entryFieldName: string) {
	return async function(entry: T) {
		const className = classConstructor.name;
		const commandArgs = {[entryFieldName]: entry};
		const result = await apolloClient.mutate({
			mutation: gql`
				mutation($input: Add${className}Input!) {
					add${className}(input: $input) {
						id
					}
				}
			`,
			variables: {input: commandArgs},
		});
		return result.data[`add${className}`] as ResultShape;
	};
}
function CreateFunc_RunCommand_DeleteX<ResultShape = {}, T = any>(classConstructor: new(..._)=>T) {
	return async function(commandArgs: {id: string}) {
		const className = classConstructor.name;
		const result = await apolloClient.mutate({
			mutation: gql`
				mutation($input: Delete${className}Input!) {
					delete${className}(input: $input) { __typename }
				}
			`,
			variables: {input: commandArgs},
		});
		return result.data[`delete${className}`] as ResultShape;
	};
}
function CreateFunc_RunCommand_UpdateX<ResultShape = {}, T = any>(classConstructor: new(..._)=>T) {
	return async function(commandArgs: {id: string, updates: Partial<T>}) {
		const className = classConstructor.name;
		const result = await apolloClient.mutate({
			mutation: gql`
				mutation($input: Update${className}Input!) {
					update${className}(input: $input) { __typename }
				}
			`,
			variables: {input: commandArgs},
		});
		return result.data[`update${className}`] as ResultShape;
	};
}

export const RunCommand_AddAccessPolicy = CreateFunc_RunCommand_AddX(AccessPolicy, "policy");
export const RunCommand_AddMedia = CreateFunc_RunCommand_AddX(Media, "media");
export const RunCommand_AddNodeTag = CreateFunc_RunCommand_AddX(NodeTag, "nodeTag");
export const RunCommand_AddShare = CreateFunc_RunCommand_AddX(Share, "share");
export const RunCommand_AddTerm = CreateFunc_RunCommand_AddX(Term, "term");

export const RunCommand_DeleteAccessPolicy = CreateFunc_RunCommand_DeleteX(AccessPolicy);
export const RunCommand_DeleteMedia = CreateFunc_RunCommand_DeleteX(Media);
export const RunCommand_DeleteNodeTag = CreateFunc_RunCommand_DeleteX(NodeTag);
export const RunCommand_DeleteShare = CreateFunc_RunCommand_DeleteX(Share);
export const RunCommand_DeleteTerm = CreateFunc_RunCommand_DeleteX(Term);

export const RunCommand_UpdateAccessPolicy = CreateFunc_RunCommand_UpdateX(AccessPolicy);
export const RunCommand_UpdateMedia = CreateFunc_RunCommand_UpdateX(Media);
export const RunCommand_UpdateNodeTag = CreateFunc_RunCommand_UpdateX(NodeTag);
export const RunCommand_UpdateShare = CreateFunc_RunCommand_UpdateX(Share);
export const RunCommand_UpdateTerm = CreateFunc_RunCommand_UpdateX(Term);

// other commands
// ==========