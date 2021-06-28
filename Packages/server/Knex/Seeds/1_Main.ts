import {MapNode, MapNodeRevision, Map, MapType} from "dm_common";
import {Knex} from "knex";
import {CE} from "web-vcore/nm/js-vextensions";
import {GenerateUUID} from "web-vcore/nm/mobx-graphlink";

// use literal, instead of importing from dm_common (avoids ts-node issues with import-tree)
const globalMapID = "GLOBAL_MAP_00000000001";
const globalRootNodeID = "GLOBAL_ROOT_0000000001";

const maps: Map[] = [
	{
		id: globalMapID,
		accessPolicy: null,
		name: "Global",
		creator: null,
		createdAt: Date.now(),
		type: "global" as MapType,
		rootNode: globalRootNodeID,
		defaultExpandDepth: 3,
		editors: [],
		edits: 0,
		editedAt: null,
	}
];

const nodes: (MapNode & {revision: MapNodeRevision})[] = [
	{
		//id: GenerateUUID(),
		id: globalRootNodeID,
		accessPolicy: null,
		createdAt: Date.now(),
		revision: {
			id: GenerateUUID(),
			//node: LastUUID(-1),
			node: globalRootNodeID,
			createdAt: Date.now(),
			titles: JSON.stringify({
				base: "Root",
			}) as any,
		},
	}
];

export default async function seed(knex: Knex.Transaction) {
	console.log(`Adding nodes and node-revisions...`);
	for (const node of nodes) {
		await knex("nodes").insert(CE(node).Excluding("revision"));
		await knex("nodeRevisions").insert(node.revision);
	}

	// maps after nodes, for Map.rootNode fk-constraint
	console.log(`Adding maps...`);
	for (const map of maps) {
		await knex("maps").insert(map);
	}
	
	console.log(`Done seeding data.`);
};