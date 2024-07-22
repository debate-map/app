import {ServerLink} from "./ServerLink.js";

export async function GetMaps(/** @type {ServerLink} */ link) {
	/*const result = await link.Query({
		query: `query {
			maps { id creator createdAt name rootNode }
		}`,
	});*/
	const result = await link.SubscribeTemp({
		query: `subscription {
			maps { nodes { id creator createdAt name rootNode } }
		}`,
	});
	return result.maps.nodes;
}