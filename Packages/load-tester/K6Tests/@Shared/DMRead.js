import {ServerLink} from "./ServerLink.js";

/** @returns {Promise<import("dm_common").AccessPolicy[]>} */
export async function GetAccessPolicies(/** @type {ServerLink} */ link) {
	return await link.QueryOrSubOnce({
		query: `query {
			accessPolicies { id name }
		}`,
	}, "accessPolicies", true);
}

/** @returns {Promise<import("dm_common").Map[]>} */
export async function GetMaps(/** @type {ServerLink} */ link) {
	return await link.QueryOrSubOnce({
		query: `query {
			maps { id creator createdAt name rootNode }
		}`,
	}, "maps", true);
}

/** @returns {Promise<import("dm_common").Map>} */
export async function GetMap(/** @type {ServerLink} */ link, id) {
	return await link.QueryOrSubOnce({
		query: `query($id: ID!) {
			map(id: $id) { id creator createdAt name rootNode }
		}`,
		variables: {id},
	}, "map");
}

/** @returns {Promise<import("dm_common").NodeL1>} */
export async function GetNode(/** @type {ServerLink} */ link, /** @type {string} */ nodeID) {
	if (!nodeID) throw new Error("NodeID is null/undefined.");
	return await link.QueryOrSubOnce({
		query: `query($nodeID: ID!) {
			node(id: $nodeID) { id type }
		}`,
		variables: {nodeID},
	}, "node");
}

/** @returns {Promise<import("dm_common").NodeLink[]>} */
export async function GetNodeLinks(/** @type {ServerLink} */ link, /** @type {string} */ parentID) {
	return await link.QueryOrSubOnce({
		query: `query($parentID: ID!) {
			nodeLinks(filter: {
				parent: {equalTo: $parentID},
			}) {
				id creator createdAt parent child group orderKey form
				seriesAnchor seriesEnd polarity c_parentType c_childType
			}
		}`,
		variables: {parentID},
	}, "nodeLinks", true);
}

/** @returns {Promise<import("dm_common").Node[]>} */
export async function GetNodeChildren(/** @type {ServerLink} */ link, /** @type {string} */ parentID) {
	const links = await GetNodeLinks(link, parentID);
	return await GetNodesForLinks(link, links);
}

/** @returns {Promise<import("dm_common").Node[]>} */
export async function GetNodesForLinks(/** @type {ServerLink} */ link, links) {
	/** @type {import("dm_common").Node[]} */
	const nodes = [];
	for (const nodeLink of links) {
		const node = await GetNode(link, nodeLink.child);
		nodes.push(node);
	}
	return nodes;
}