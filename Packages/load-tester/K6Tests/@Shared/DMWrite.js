import {ServerLink} from "./ServerLink.js";

// standardized add/update/delete commands
// ==========

export function RunCommand_AddX(/** @type {ServerLink} */ link, typeName, entryFieldName, entry) {
	const func = CreateFunc_RunCommand_AddX(typeName, entryFieldName);
	return func(link, entry);
}
function CreateFunc_RunCommand_AddX(typeName, entryFieldName) {
	return function(/** @type {ServerLink} */ link, entry) {
		const inputFields = {[entryFieldName]: entry};
		const resultData = link.Mutate({
			query: `
				mutation($input: Add${typeName}Input!) {
					add${typeName}(input: $input) { id }
				}
			`,
			variables: {input: inputFields},
		});
		return resultData[`add${typeName}`];
	};
}
export function RunCommand_DeleteX(/** @type {ServerLink} */ link, typeName, entry) {
	const func = CreateFunc_RunCommand_DeleteX(typeName);
	return func(link, entry);
}
function CreateFunc_RunCommand_DeleteX(typeName) {
	return function(/** @type {ServerLink} */ link, /** @type {id: string} */ inputFields) {
		const resultData = link.Mutate({
			query: `
				mutation($input: Delete${typeName}Input!) {
					delete${typeName}(input: $input) { __typename }
				}
			`,
			variables: {input: inputFields},
		});
		return resultData[`delete${typeName}`];
	};
}
export function RunCommand_UpdateX(/** @type {ServerLink} */ link, typeName, entryFieldName, entry) {
	const func = CreateFunc_RunCommand_UpdateX(typeName, entryFieldName);
	return func(link, entry);
}
function CreateFunc_RunCommand_UpdateX(typeName) {
	return function(/** @type {ServerLink} */ link, /** @type {id: string, updates: Partial<T>} */ inputFields) {
		const resultData = link.Mutate({
			query: `
				mutation($input: Update${typeName}Input!) {
					update${typeName}(input: $input) { __typename }
				}
			`,
			variables: {input: inputFields},
		});
		return resultData[`update${typeName}`];
	};
}

/** @typedef {import("dm_common").Map} Map */

// export const RunCommand_AddAccessPolicy = CreateFunc_RunCommand_AddX("AccessPolicy", "policy");
/** @type {(link: ServerLink, entry: Map) => {id: string}} */
export const RunCommand_AddMap = CreateFunc_RunCommand_AddX("Map", "map");
// export const RunCommand_AddMedia = CreateFunc_RunCommand_AddX("Media", "media");
// export const RunCommand_AddNodeLink = CreateFunc_RunCommand_AddX("NodeLink", "link");
// export const RunCommand_AddNodePhrasing = CreateFunc_RunCommand_AddX("NodePhrasing", "phrasing");
// export const RunCommand_AddNodeTag = CreateFunc_RunCommand_AddX("NodeTag", "tag");
// export const RunCommand_AddShare = CreateFunc_RunCommand_AddX("Share", "share");
// export const RunCommand_AddTerm = CreateFunc_RunCommand_AddX("Term", "term");
// export const RunCommand_AddTimeline = CreateFunc_RunCommand_AddX("Timeline", "timeline");
// export const RunCommand_AddTimelineStep = CreateFunc_RunCommand_AddX("TimelineStep", "step");

// export const RunCommand_DeleteAccessPolicy = CreateFunc_RunCommand_DeleteX("AccessPolicy");
// export const RunCommand_DeleteMap = CreateFunc_RunCommand_DeleteX("Map");
// export const RunCommand_DeleteMedia = CreateFunc_RunCommand_DeleteX("Media");
// export const RunCommand_DeleteNodeLink = CreateFunc_RunCommand_DeleteX("NodeLink");
// export const RunCommand_DeleteNodePhrasing = CreateFunc_RunCommand_DeleteX("NodePhrasing");
// export const RunCommand_DeleteNodeTag = CreateFunc_RunCommand_DeleteX("NodeTag");
// export const RunCommand_DeleteShare = CreateFunc_RunCommand_DeleteX("Share");
// export const RunCommand_DeleteTerm = CreateFunc_RunCommand_DeleteX("Term");
// export const RunCommand_DeleteTimeline = CreateFunc_RunCommand_DeleteX("Timeline");
// export const RunCommand_DeleteTimelineStep = CreateFunc_RunCommand_DeleteX("TimelineStep");

// export const RunCommand_UpdateAccessPolicy = CreateFunc_RunCommand_UpdateX("AccessPolicy");
// export const RunCommand_UpdateMap = CreateFunc_RunCommand_UpdateX("Map");
// export const RunCommand_UpdateMedia = CreateFunc_RunCommand_UpdateX("Media");
// export const RunCommand_UpdateNodeLink = CreateFunc_RunCommand_UpdateX("NodeLink");
// export const RunCommand_UpdateNodePhrasing = CreateFunc_RunCommand_UpdateX("NodePhrasing");
// export const RunCommand_UpdateNodeTag = CreateFunc_RunCommand_UpdateX("NodeTag");
// export const RunCommand_UpdateShare = CreateFunc_RunCommand_UpdateX("Share");
// export const RunCommand_UpdateTerm = CreateFunc_RunCommand_UpdateX("Term");
// export const RunCommand_UpdateTimeline = CreateFunc_RunCommand_UpdateX("Timeline");
// export const RunCommand_UpdateTimelineStep = CreateFunc_RunCommand_UpdateX("TimelineStep");

// other commands
// ==========

/** @typedef {import("dm_client/Source/Utils/DB/Command.js").AddChildNodeInput} AddChildNodeInput */

/** @returns {Promise<{nodeID: string, revisionID: string, linkID: string, doneAt: number}>} */
export function RunCommand_AddChildNode(/** @type {ServerLink} */ link, /** @type {AddChildNodeInput} */ inputFields) {
	const resultData = link.Mutate({
		query: `mutation($input: AddChildNodeInput!) { addChildNode(input: $input) { nodeID revisionID linkID doneAt } }`,
		variables: {input: inputFields},
	});
	return resultData.addChildNode;
}