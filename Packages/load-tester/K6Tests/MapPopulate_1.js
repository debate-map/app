import {sleep} from "k6";
import {ServerLink} from "./@Shared/ServerLink.js";
import {GetAccessPolicies, GetMaps, GetNode, GetNodeChildren, GetNodeLinks} from "./@Shared/DMRead.js";
import {RunCommand_AddChildNode, RunCommand_AddMap, RunCommand_AddX} from "./@Shared/DMWrite.js";

export const options = {
	iterations: 1,
};

export default function() {
	Main();
}
function Main() {
	PopulateMap("PJl7qjF5TBaI-zaLOatK0g", 3, 8);
}

function PopulateMap(mapID, depthToEnsure, childrenPerLayer) {
	const link = new ServerLink({useWS: false});
	//await link.OnReady();

	const policies = GetAccessPolicies(link);
	const policyID = policies.find(a=>a.name == "Public, ungoverned (standard)").id;

	const map = GetMaps(link).find(a=>a.id == mapID);
	const rootNode = GetNode(link, map.rootNode);
	let lastNodeLayer = [{path: "0", node: rootNode}];

	let nodesCreated = 0;

	// we ensure depthToEnsure, but we do that by adding children to layer depthToEnsure-1, so `depth` can stay one less than depthToEnsure
	for (let depth = 0; depth < depthToEnsure; depth++) {
		/** @type {{path: string, node: import("dm_common").NodeL1}} */
		const nextNodeLayer = [];
		for (const {path, node} of lastNodeLayer) {
			const childLinks = GetNodeLinks(link, node.id).sort((a, b)=>a.orderKey.localeCompare(b.orderKey));
			const children = childLinks.map(a=>GetNode(link, a.child));
			for (const [i, child] of children.entries()) {
				nextNodeLayer.push({path: `${path}.${i}`, node: child});
			}
			if (children.length < childrenPerLayer) {
				const childrenToAdd = childrenPerLayer - children.length;
				for (let i = 0; i < childrenToAdd; i++) {
					const fullI = children.length + i;
					const orderKey_number = fullI + 1; // add 1, since order-key algo doesn't like trailing 0 (other than a0)
					const orderKey = `a${orderKey_number.toString().padStart(2, "0")}`;

					const childPath = `${path}.${fullI}`;
					const result = RunCommand_AddChildNode(link, {
						mapID,
						parentID: node.id,
						link: {
							group: "generic",
							orderKey,
						},
						node: {
							type: "category",
							accessPolicy: policyID,
						},
						revision: {
							phrasing: {
								text_base: `Child ${childPath}`,
								terms: [],
							},
							attachments: [],
							displayDetails: {
								childOrdering: "manual",
							},
						},
					});
					const childNode = GetNode(link, result.nodeID);
					nextNodeLayer.push({path: childPath, node: childNode});
					nodesCreated++;
				}
			}
			lastNodeLayer = nextNodeLayer;
		}
	}
	console.log("Nodes created:", nodesCreated);
}