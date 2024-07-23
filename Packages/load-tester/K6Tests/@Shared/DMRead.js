import {ServerLink} from "./ServerLink.js";

/** @returns {import("dm_common").AccessPolicy[]} */
export function GetAccessPolicies(/** @type {ServerLink} */ link) {
	const result = link.Query({
		query: `query {
			accessPolicies { id name }
		}`,
	});
	console.log("Policies:", result);
	return result.accessPolicies;
}

/** @returns {import("dm_common").Map[]} */
export function GetMaps(/** @type {ServerLink} */ link) {
	const result = link.Query({
		query: `query {
			maps { id creator createdAt name rootNode }
		}`,
	});
	return result.maps;
	/*const result = await link.SubscribeTemp({
		query: `subscription {
			maps { nodes { id creator createdAt name rootNode } }
		}`,
	});
	return result.maps.nodes;*/
}

/** @returns {import("dm_common").NodeL1} */
export function GetNode(/** @type {ServerLink} */ link, /** @type {string} */ nodeID) {
	if (!nodeID) throw new Error("NodeID is null/undefined.");
	const result = link.Query({
		query: `query($nodeID: ID!) {
			node(id: $nodeID) { id type }
		}`,
		variables: {nodeID},
	});
	return result.node;
}

/** @returns {import("dm_common").NodeLink[]} */
export function GetNodeLinks(/** @type {ServerLink} */ link, /** @type {string} */ parentID) {
	const result = link.Query({
		query: `query($parentID: ID!) {
			nodeLinks(filter: {
				parent: {equalTo: $parentID},
			}) {
				id creator createdAt parent child group orderKey form
				seriesAnchor seriesEnd polarity c_parentType c_childType
			}
		}`,
		variables: {parentID},
	});
	return result.nodeLinks;
}

/** @returns {import("dm_common").Node[]} */
export function GetNodeChildren(/** @type {ServerLink} */ link, /** @type {string} */ parentID) {
	const links = GetNodeLinks(link, parentID);
	return GetNodesForLinks(link, links);
}

/** @returns {import("dm_common").Node[]} */
export function GetNodesForLinks(/** @type {ServerLink} */ link, links) {
	/** @type {import("dm_common").Node[]} */
	const nodes = [];
	for (const nodeLink of links) {
		const node = GetNode(link, nodeLink.child);
		nodes.push(node);
	}
	return nodes;
}