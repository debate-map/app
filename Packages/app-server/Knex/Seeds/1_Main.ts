import {MapNode, MapNodeRevision, Map, MapNodeType, User, globalMapID, globalRootNodeID, systemUserID, systemUserName, AccessPolicy, UserHidden, PermissionSet, PermissionSetForType, PermitCriteria, systemPolicy_publicUngoverned_name, systemPolicy_publicGoverned_name, systemPolicy_privateGoverned_name} from "dm_common";
import {Knex} from "knex";
import {CE, string} from "web-vcore/nm/js-vextensions.js";
import {GenerateUUID, LastUUID} from "web-vcore/nm/mobx-graphlink.js";

//import {GenerateUUID} from "web-vcore/node_modules/mobx-graphlink/Source/Extensions/KeyGenerator.js";
/*import fs from "fs";
import {createRequire} from "module";
const require = createRequire(import.meta.url);
const {GenerateUUID} =
	fs.existsSync("web-vcore/node_modules/mobx-graphlink/Source/Extensions/KeyGenerator.js") ? require("web-vcore/node_modules/mobx-graphlink/Source/Extensions/KeyGenerator.js") :
	fs.existsSync("mobx-graphlink/Source/Extensions/KeyGenerator.js") ? require("mobx-graphlink/Source/Extensions/KeyGenerator.js") :
	(()=>{ throw new Error("Could not find mobx-graphlink's KeyGenerator.ts file."); })();*/

const temp = [] as any[];
const Store = <T>(val: T)=>{
	temp.push(val);
	return val;
};
const Pop = <T>()=>temp.pop() as T;

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
			addToStream: false,
			id: systemUserID,
			email: "debatemap@gmail.com",
			providerData: [],
		},
	},
});

const PC_Anyone = ()=>new PermitCriteria({minApprovals: 0, minApprovalPercent: 0});
const PC_NoOne = ()=>new PermitCriteria({minApprovals: -1, minApprovalPercent: -1});

const accessPolicies = TypeCheck(AccessPolicy, {
	public_ungoverned: {
		id: GenerateUUID(),
		name: systemPolicy_publicUngoverned_name,
		creator: systemUserID,
		createdAt: Date.now(),
		permissions: Store(new PermissionSet({
			terms:			new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne()}),
			medias:			new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne()}),
			maps:				new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne()}),
			nodes:			new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne(), vote: PC_Anyone(), addPhrasing: PC_Anyone()}),
			nodeRatings:	new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne()}),
		})),
		permissions_userExtends: {},
	},
	public_governed: {
		id: GenerateUUID(),
		name: systemPolicy_publicGoverned_name,
		creator: systemUserID,
		createdAt: Date.now(),
		permissions: Store(new PermissionSet({
			terms:			new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne()}),
			medias:			new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne()}),
			maps:				new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne()}),
			nodes:			new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne(), vote: PC_Anyone(), addPhrasing: PC_NoOne()}),
			nodeRatings:	new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne()}),
		})),
		permissions_userExtends: {},
	},
	private_governed: {
		id: GenerateUUID(),
		name: systemPolicy_privateGoverned_name,
		creator: systemUserID,
		createdAt: Date.now(),
		permissions: Store(new PermissionSet({
			terms:			new PermissionSetForType({access: false, modify: PC_NoOne(), delete: PC_NoOne()}),
			medias:			new PermissionSetForType({access: false, modify: PC_NoOne(), delete: PC_NoOne()}),
			maps:				new PermissionSetForType({access: false, modify: PC_NoOne(), delete: PC_NoOne()}),
			nodes:			new PermissionSetForType({access: false, modify: PC_NoOne(), delete: PC_NoOne(), vote: PC_NoOne(), addPhrasing: PC_NoOne()}),
			nodeRatings:	new PermissionSetForType({access: false, modify: PC_NoOne(), delete: PC_NoOne()}),
		})),
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
		rootNodeForMap: globalMapID,
		revision: {
			id: GenerateUUID(),
			//node: LastUUID(-1),
			node: globalRootNodeID,
			creator: systemUserID,
			createdAt: Date.now(),
			phrasing: JSON.stringify({
				text_base: "Root",
				terms: [],
			}) as any,
		},
		c_currentRevision: LastUUID(),
	},
});

export default async function seed(knex: Knex.Transaction) {
	// needed, since "maps" and "nodeRevisions" both have fk-refs to each other, so whichever is added first would error (without this flag)
	await knex.raw("SET CONSTRAINTS ALL DEFERRED;");

	console.log(`Adding users and userHiddens...`);
	for (const user of Object.values(users)) {
		await knex("users").insert(CE(user).ExcludeKeys("hidden"));
		await knex("userHiddens").insert(user.hidden);
	}

	console.log(`Adding access-policies...`);
	for (const policy of Object.values(accessPolicies)) {
		await knex("accessPolicies").insert(policy);
	}

	console.log(`Adding maps...`);
	for (const map of Object.values(maps)) {
		await knex("maps").insert(map);
	}

	console.log(`Adding nodes and node-revisions...`);
	for (const node of Object.values(nodes)) {
		await knex("nodes").insert(CE(node).ExcludeKeys("revision"));
		await knex("nodeRevisions").insert(node.revision);
	}

	console.log(`Done seeding data.`);
}