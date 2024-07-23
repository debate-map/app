import {ServerLink} from "./ServerLink.js";

/** @returns {import("../../../js-common").AccessPolicy[]} */
export async function GetAccessPolicies(/** @type {ServerLink} */ link) {
	const result = await link.Query({
		query: `query {
			accessPolicies { id name }
		}`,
	});
	console.log("Policies:", result);
	return result.accessPolicies;
}

/** @returns {import("../../../js-common").Map[]} */
export async function GetMaps(/** @type {ServerLink} */ link) {
	const result = await link.Query({
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