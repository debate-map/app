import {MapNode, MapNodeRevision, Map, MapType, MapNodeType, User, globalMapID, globalRootNodeID, systemUserID, AccessPolicy} from "dm_common";
import {Knex} from "knex";
import {CE, string} from "web-vcore/nm/js-vextensions.js";
import {GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";

const rand = ()=>Math.random();
// example: [rand()]: {...},

function TypeCheck<T, T2 extends {[key: string]: T}>(_: new(..._)=>T, collection: T2) {
	return collection;
}

const users = TypeCheck(User, {
	system: {
		id: systemUserID,
		displayName: "[system]",
		photoURL: null,
		joinDate: Date.now(),
		permissionGroups: {basic: true, verified: true, mod: true, admin: true},
		edits: 0,
		lastEditAt: null,
	}
});

const accessPolicies = TypeCheck(AccessPolicy, {
	public_ungoverned: {
		id: GenerateUUID(),
		name: "Public, ungoverned (standard)",
		base: null,
		permissions_base: {
			access: true,
			addRevisions: true,
			vote: true,
			delete: false,
		},
	},
	public_governed: {
		id: GenerateUUID(),
		name: "Public, governed (standard)",
		base: null,
		permissions_base: {
			access: true,
			addRevisions: false,
			vote: true,
			delete: false,
		},
	},
	private_governed: {
		id: GenerateUUID(),
		name: "Private, governed (standard)",
		base: null,
		permissions_base: {
			access: false,
			addRevisions: false,
			vote: false,
			delete: false,
		},
	},
});

const maps = TypeCheck(Map, {
	global: {
		id: globalMapID,
		accessPolicy: accessPolicies.public_governed.id,
		name: "Global",
		creator: systemUserID,
		createdAt: Date.now(),
		type: "global" as MapType,
		rootNode: globalRootNodeID,
		defaultExpandDepth: 3,
		editors: [],
		edits: 0,
		editedAt: null,
	},
});

const nodes = TypeCheck(MapNode as new()=>(MapNode & {revision: MapNodeRevision}), {
	globalRoot: {
		//id: GenerateUUID(),
		id: globalRootNodeID,
		accessPolicy: accessPolicies.public_governed.id,
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
});

export default async function seed(knex: Knex.Transaction) {
	console.log(`Adding users...`);
	for (const user of Object.values(users)) {
		await knex("users").insert(user);
	}

	console.log(`Adding access-policies...`);
	for (const policy of Object.values(accessPolicies)) {
		await knex("accessPolicies").insert(policy);
	}

	console.log(`Adding nodes and node-revisions...`);
	for (const node of Object.values(nodes)) {
		await knex("nodes").insert(CE(node).Excluding("revision"));
		await knex("nodeRevisions").insert(node.revision);
	}

	// maps after nodes, for Map.rootNode fk-constraint
	console.log(`Adding maps...`);
	for (const map of Object.values(maps)) {
		await knex("maps").insert(map);
	}
	
	console.log(`Done seeding data.`);
};