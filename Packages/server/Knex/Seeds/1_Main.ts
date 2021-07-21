import {MapNode, MapNodeRevision, Map, MapNodeType, User, globalMapID, globalRootNodeID, systemUserID, systemUserName, AccessPolicy, UserHidden} from "dm_common";
import {Knex} from "knex";
import {CE, string} from "web-vcore/nm/js-vextensions.js";
import {GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";

//import {GenerateUUID} from "web-vcore/node_modules/mobx-graphlink/Source/Extensions/KeyGenerator.js";
/*import fs from "fs";
import {createRequire} from "module";
const require = createRequire(import.meta.url);
const {GenerateUUID} =
	fs.existsSync("web-vcore/node_modules/mobx-graphlink/Source/Extensions/KeyGenerator.js") ? require("web-vcore/node_modules/mobx-graphlink/Source/Extensions/KeyGenerator.js") :
	fs.existsSync("mobx-graphlink/Source/Extensions/KeyGenerator.js") ? require("mobx-graphlink/Source/Extensions/KeyGenerator.js") :
	(()=>{ throw new Error("Could not find mobx-graphlink's KeyGenerator.ts file."); })();*/

const rand = ()=>Math.random();
// example: [rand()]: {...},

function TypeCheck<T, T2 extends {[key: string]: T}>(__: new(..._)=>T, collection: T2) {
	return collection;
}

const users = TypeCheck(User as new()=>(User & {hidden: UserHidden}), {
	system: {
		id: systemUserID,
		displayName: systemUserName,
		photoURL: null,
		joinDate: Date.now(),
		permissionGroups: {basic: true, verified: true, mod: true, admin: true},
		edits: 0,
		lastEditAt: null,
		hidden: {
			id: systemUserID,
			email: "debatemap@gmail.com",
			providerData: [],
		},
	},
});

const accessPolicies = TypeCheck(AccessPolicy, {
	public_ungoverned: {
		id: GenerateUUID(),
		name: "Public, ungoverned (standard)",
		creator: systemUserID,
		createdAt: Date.now(),
		base: null,
		permissions_base: {
			access: true,
			addRevisions: true,
			vote: true,
			delete: false,
		},
		permissions_userExtends: {},
	},
	public_governed: {
		id: GenerateUUID(),
		name: "Public, governed (standard)",
		creator: systemUserID,
		createdAt: Date.now(),
		base: null,
		permissions_base: {
			access: true,
			addRevisions: false,
			vote: true,
			delete: false,
		},
		permissions_userExtends: {},
	},
	private_governed: {
		id: GenerateUUID(),
		name: "Private, governed (standard)",
		creator: systemUserID,
		createdAt: Date.now(),
		base: null,
		permissions_base: {
			access: false,
			addRevisions: false,
			vote: false,
			delete: false,
		},
		permissions_userExtends: {},
	},
});

const maps = TypeCheck(Map, {
	global: {
		id: globalMapID,
		accessPolicy: accessPolicies.public_governed.id,
		name: "Global",
		creator: systemUserID,
		createdAt: Date.now(),
		rootNode: globalRootNodeID,
		defaultExpandDepth: 3,
		editors: [],
		edits: 0,
		editedAt: Date.now(),
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
			termAttachments: [],
		},
	},
});

export default async function seed(knex: Knex.Transaction) {
	console.log(`Adding users and userHiddens...`);
	for (const user of Object.values(users)) {
		await knex("users").insert(CE(user).Excluding("hidden"));
		await knex("userHiddens").insert(user.hidden);
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
}