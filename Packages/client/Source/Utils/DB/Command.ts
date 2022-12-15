import {AccessPolicy, NodeTag, Media, Share, Term, NodePhrasing, NodeRevision, Map} from "dm_common";
import {apolloClient} from "Utils/LibIntegrations/Apollo";
import {gql} from "web-vcore/nm/@apollo/client";

// standardized add/update/delete commands
// ==========

function CreateFunc_RunCommand_AddX<ResultShape = {id: string}, T = any>(classConstructor: new(..._)=>T, entryFieldName: string) {
	return async function(entry: T) {
		const className = classConstructor.name;
		const inputFields = {[entryFieldName]: entry};
		const result = await apolloClient.mutate({
			mutation: gql`
				mutation($input: Add${className}Input!) {
					add${className}(input: $input) { id }
				}
			`,
			variables: {input: inputFields},
		});
		return result.data[`add${className}`] as ResultShape;
	};
}
function CreateFunc_RunCommand_DeleteX<ResultShape = {}, T = any>(classConstructor: new(..._)=>T) {
	return async function(inputFields: {id: string}) {
		const className = classConstructor.name;
		const result = await apolloClient.mutate({
			mutation: gql`
				mutation($input: Delete${className}Input!) {
					delete${className}(input: $input) { __typename }
				}
			`,
			variables: {input: inputFields},
		});
		return result.data[`delete${className}`] as ResultShape;
	};
}
function CreateFunc_RunCommand_UpdateX<ResultShape = {}, T = any>(classConstructor: new(..._)=>T) {
	return async function(inputFields: {id: string, updates: Partial<T>}) {
		const className = classConstructor.name;
		const result = await apolloClient.mutate({
			mutation: gql`
				mutation($input: Update${className}Input!) {
					update${className}(input: $input) { __typename }
				}
			`,
			variables: {input: inputFields},
		});
		return result.data[`update${className}`] as ResultShape;
	};
}

export const RunCommand_AddAccessPolicy = CreateFunc_RunCommand_AddX(AccessPolicy, "policy");
export const RunCommand_AddMedia = CreateFunc_RunCommand_AddX(Media, "media");
export const RunCommand_AddNodePhrasing = CreateFunc_RunCommand_AddX(NodePhrasing, "phrasing");
export const RunCommand_AddNodeTag = CreateFunc_RunCommand_AddX(NodeTag, "tag");
export const RunCommand_AddShare = CreateFunc_RunCommand_AddX(Share, "share");
export const RunCommand_AddTerm = CreateFunc_RunCommand_AddX(Term, "term");

export const RunCommand_DeleteAccessPolicy = CreateFunc_RunCommand_DeleteX(AccessPolicy);
export const RunCommand_DeleteMedia = CreateFunc_RunCommand_DeleteX(Media);
export const RunCommand_DeleteNodePhrasing = CreateFunc_RunCommand_DeleteX(NodePhrasing);
export const RunCommand_DeleteNodeTag = CreateFunc_RunCommand_DeleteX(NodeTag);
export const RunCommand_DeleteShare = CreateFunc_RunCommand_DeleteX(Share);
export const RunCommand_DeleteTerm = CreateFunc_RunCommand_DeleteX(Term);

export const RunCommand_UpdateAccessPolicy = CreateFunc_RunCommand_UpdateX(AccessPolicy);
export const RunCommand_UpdateMedia = CreateFunc_RunCommand_UpdateX(Media);
export const RunCommand_UpdateNodePhrasing = CreateFunc_RunCommand_UpdateX(NodePhrasing);
export const RunCommand_UpdateNodeTag = CreateFunc_RunCommand_UpdateX(NodeTag);
export const RunCommand_UpdateShare = CreateFunc_RunCommand_UpdateX(Share);
export const RunCommand_UpdateTerm = CreateFunc_RunCommand_UpdateX(Term);

// other commands
// ==========

/*type NodeRevisionInput =
	Omit<Partial<NodeRevision>, "id" | "creator" | "createdAt">
	& {id?: never, creator?: never, createdAt?: never};*/
type NodeRevisionInput = Partial<NodeRevision> & {id?: never, creator?: never, createdAt?: never};
export async function RunCommand_AddNodeRevision(inputFields: {mapID?: string|n, revision: NodeRevisionInput}) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: AddNodeRevisionInput!) { addNodeRevision(input: $input) { id } }`,
		variables: {input: inputFields},
	});
	return result.data.addNodeRevision as {id: string};
}

export async function RunCommand_DeleteArgument(inputFields: {mapID?: string|n, argumentID: string, claimID: string, deleteClaim: boolean}) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: DeleteArgumentInput!) { deleteArgument(input: $input) { __typename } }`,
		variables: {input: inputFields},
	});
	return result.data.deleteArgument as {};
}

export const RunCommand_DeleteMap = CreateFunc_RunCommand_DeleteX(Map);

export async function RunCommand_DeleteNode(inputFields: {mapID?: string|n, nodeID: string}) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: DeleteNodeInput!) { deleteNode(input: $input) { __typename } }`,
		variables: {input: inputFields},
	});
	return result.data.deleteNode as {};
}

export async function RunCommand_UnlinkNode(inputFields: {mapID?: string|n, parentID: string, childID: string}) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: UnlinkNodeInput!) { unlinkNode(input: $input) { __typename } }`,
		variables: {input: inputFields},
	});
	return result.data.unlinkNode as {};
}