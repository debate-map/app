import {sleep} from "k6";
import {ServerLink} from "./@Shared/ServerLink.js";
import {GetMap, GetNode, GetNodeChildren} from "./@Shared/DMRead.js";

/*

Basic load-testing strategy:
* Start with 0 VUs (virtual users), ramping up to 10,000 VUs, over a 3 minute period.
* Each user opens up the same map, which has its root-node + 3 layers of nodes.
	* In that map, each (non-leaf) node has 8 children. So total node count in map is: 1+8*8*8 = 513 nodes
* Each virtual user's behavior is to click to expand each node, in a breadth-first fashion, with one second of delay between each click.
* Once the user has expanded all 65 non-leaf nodes (displaying all 513 nodes in the map), the virtual-user "refreshes the page" and starts again until the load-test ends (at the 3 minute mark).

*/

function GetOpts(useSubscription) {
	return {
		//executor: "per-vu-iterations",
		//timeUnit: "1s",

		env: {
			USE_SUBSCRIPTION: useSubscription ? "1" : "",
		},

		//executor: "ramping-arrival-rate",
		//preAllocatedVUs: 1,
		//maxVUs: 10000,

		executor: "ramping-vus",
		//startRate: 0,
		stages: [
			{target: 10000, duration: "3m"}, // linearly go from 0 -> ? iters/s (over ?m period)
			//{target: 10000, duration: "5m"}, // stay here for a while
		],
	};
}
export const options = {
	scenarios: {
		//query: GetOpts(false),
		subscription: GetOpts(true),
	},
};

export default function() {
	ExploreMap("PJl7qjF5TBaI-zaLOatK0g", 3); // this map has 1+512 nodes
}
async function ExploreMap(mapID, depthToExplore) {
	const link = new ServerLink({useWS: __ENV.USE_SUBSCRIPTION});
	if (__ENV.USE_SUBSCRIPTION) await link.OnReady();
	const map = await GetMap(link, mapID);
	//console.log("Map:", map);

	const rootNode = await GetNode(link, map.rootNode);
	let currentNodeLayer = [rootNode];

	// depth < depthToExplore, since we explore one depth lower than final `depth`
	for (let depth = 0; depth < depthToExplore; depth++) {
		const nextNodeLayer = [];
		for (const node of currentNodeLayer) {
			const children = await GetNodeChildren(link, node.id);
			sleep(1);
			for (const child of children) {
				nextNodeLayer.push(child);
			}
		}
		//console.log(`Depth ${depth + 1}:`, nextNodeLayer.map(a=>a.id));
		currentNodeLayer = nextNodeLayer;
	}
}