import {MapNode, MapNodeRevision, Map, MapType, MapNodeType, User, globalMapID,  globalRootNodeID, systemUserID} from "dm_common";
import {Knex} from "knex";
import {CE} from "web-vcore/nm/js-vextensions.js";
import {GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";

// use literal, instead of importing from dm_common (avoids ts-node issues with import-tree)
/*const globalMapID = "GLOBAL_MAP_00000000001";
const globalRootNodeID = "GLOBAL_ROOT_0000000001";*/

const users: User[] = [
	{
		id: systemUserID,
		displayName: "[system]",
		photoURL: null,
		joinDate: Date.now(),
		permissionGroups: {basic: true, verified: true, mod: true, admin: true},
		edits: 0,
		lastEditAt: null,
	}
];

const maps: Map[] = [
	{
		id: globalMapID,
		accessPolicy: null,
		name: "Global",
		creator: systemUserID,
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
		creator: systemUserID,
		createdAt: Date.now(),
		type: MapNodeType.category,
		revision: {
			id: GenerateUUID(),
			//node: LastUUID(-1),
			node: globalRootNodeID,
			creator: systemUserID,
			createdAt: Date.now(),
			titles: JSON.stringify({
				base: "Root",
			}) as any,
		},
	}
];

export default async function seed(knex: Knex.Transaction) {
	console.log(`Adding users...`);
	for (const user of users) {
		await knex("users").insert(user);
	}

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