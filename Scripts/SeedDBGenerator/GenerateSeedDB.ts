import {NodeL1, NodeRevision, Map, NodeType, User, globalMapID, globalRootNodeID, systemUserID, systemUserName, AccessPolicy, UserHidden, PermissionSet, PermissionSetForType, PermitCriteria, systemPolicy_publicUngoverned_name, systemPolicy_publicGoverned_name, systemPolicy_privateGoverned_name} from "dm_common";
import {GlobalData} from "dm_common/Dist/DB/globalData/@GlobalData";
import KnexFunc, {Knex} from "knex";
import {CE, string} from "web-vcore/nm/js-vextensions.js";
import {GenerateUUID, LastUUID} from "web-vcore/nm/mobx-graphlink.js";
import {writeFileSync} from "fs";

// todo: probably find a way to make these generated UUIDs pseudo-random, with a consistent seed, so that the UUIDs do not all change whenever the seed-db script is regenerated

// mobx-graphlink import was having issue ("Named export 'v4' not found."), so use the new crypto.randomUUID() instead
// ==========
/*export const generatedUUIDHistory = [] as string[];
/** Helper, eg. for if creating a db-seed file, and you need to reference the ID of the previous entry within an array literal. *#/
export function LastUUID(indexAdjustment = 0) {
	return generatedUUIDHistory[(generatedUUIDHistory.length - 1) + indexAdjustment];
}
function GenerateUUID() {
	const result = crypto["randomUUID"]();
	generatedUUIDHistory.push(result);
	return result;
}*/
// ==========

// if the generated uuids need to be the same each time...
// ==========
/*let lastIDVal = 1;
function GenerateUUID() {
	const idVal = lastIDVal + 1;
	const result = ``;
	lastIDVal = idVal;
	generatedUUIDHistory.push(result);
	return result;
}*/
// ==========

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

function TypeCheckRaw<T, T2 extends {[key: string]: T} = {[key: string]: T}>(collection: T2) {
	return collection;
}
function TypeCheck<T, T2 extends {[key: string]: T} = {[key: string]: T}>(__: new(..._)=>T, collection: T2) {
	return collection;
}

const globalDatas = TypeCheck(GlobalData, {
	main: {
		id: "main",
		extras: {
			dbReadOnly: false,
			dbReadOnly_message: undefined,
		},
	},
});

const users = TypeCheckRaw<User & {hidden: UserHidden}>({
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
			extras: {},
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
			nodes:			new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne(), addChild: PC_Anyone(), addPhrasing: PC_Anyone(), vote: PC_Anyone()}),
			nodeRatings:	new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne()}),
			others:			new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne()}),
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
			nodes:			new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne(), addChild: PC_NoOne(), addPhrasing: PC_NoOne(), vote: PC_Anyone()}),
			nodeRatings:	new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne()}),
			others:			new PermissionSetForType({access: true, modify: PC_NoOne(), delete: PC_NoOne()}),
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
			nodes:			new PermissionSetForType({access: false, modify: PC_NoOne(), delete: PC_NoOne(), addChild: PC_NoOne(), vote: PC_NoOne(), addPhrasing: PC_NoOne()}),
			nodeRatings:	new PermissionSetForType({access: false, modify: PC_NoOne(), delete: PC_NoOne()}),
			others:			new PermissionSetForType({access: false, modify: PC_NoOne(), delete: PC_NoOne()}),
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
		//editors: [],
		// temp-fix for cell with pgsql `text[]` type being misunderstood (while generating apply commands) as a cell of type `jsonb` that *contains* an array
		// (this alternate `{}` is seen by pgsql as something that can be interpreted as an empty `text[]`)
		editors: "{}" as any,
		edits: 0,
		editedAt: Date.now(),
		extras: {},
	},
});

const nodes = TypeCheckRaw<NodeL1 & {revision: NodeRevision}>({
	globalRoot: {
		//id: GenerateUUID(),
		id: globalRootNodeID,
		accessPolicy: accessPolicies.public_governed.id,
		creator: systemUserID,
		createdAt: Date.now(),
		type: NodeType.category,
		rootNodeForMap: globalMapID,
		revision: {
			id: GenerateUUID(),
			//node: LastUUID(-1),
			node: globalRootNodeID,
			creator: systemUserID,
			createdAt: Date.now(),
			/*phrasing: JSON.stringify({
				text_base: "Root",
				terms: [],
			}) as any,*/
			phrasing: {
				text_base: "Root",
				terms: [],
			},
			attachments: [],
		},
		c_currentRevision: LastUUID(), // derived from "nodeRevisions" table
		extras: {},
	},
});

let sqlText = "";
function AddRaw(str: string) {
	if (sqlText.length > 0) sqlText += "\n";
	sqlText += str;
}
/*function Add(query: Knex.QueryBuilder<any, any>) {
	if (sqlText.length > 0) sqlText += "\n";

	//const lineSQL_base = `${query.toString()};`;
	const lineSQL_base = `${query.toSQL().toNative().sql};`;
	//const lineSQL_base = `${JSON.stringify(query.toSQL().toNative())};`;
	//const lineSQL_base = `${query.toSQL().sql};`;

	// add quoting around outermost brackets, for jsonb values/cells
	let lineSQL_final = "";
	let bracketDepth = 0;
	for (let i = 0; i < lineSQL_base.length; i++) {
		const ch = lineSQL_base[i];
		const prevCh = lineSQL_base[i - 1];
		const nextCh = lineSQL_base[i + 1];

		// processing before char is added
		if (ch == "{") {
			if (bracketDepth == 0 && prevCh != "'") {
				lineSQL_final += "'";
			}
			bracketDepth++;
		} else if (ch == "}") {
			bracketDepth--;
		}

		// add char itself
		lineSQL_final += ch;

		// processing after char is added
		if (ch == "}" && bracketDepth == 0 && nextCh != "'") {
			lineSQL_final += "'";
		}
	}

	sqlText += lineSQL_final;
}*/
function Add(query: Knex.QueryBuilder<any, any>) {
	if (sqlText.length > 0) sqlText += "\n";

	const sqlData = query.toSQL().toNative();
	const lineSQL_base = `${sqlData.sql};`;
	let lineSQL_final = lineSQL_base;
	for (let i = 0; i < sqlData.bindings.length; i++) {
		if (lineSQL_final.includes(`$${i + 1}`)) {
			let argAsStr = JSON.stringify(sqlData.bindings[i]);
			if (argAsStr.startsWith("\"")) {
				argAsStr = `'${argAsStr.slice(1, -1)}'`;
			}
			if (argAsStr.startsWith("{") || argAsStr.startsWith("[")) {
				argAsStr = `'${argAsStr.replace(/'/g, "\\'")}'`;
			}
			lineSQL_final = lineSQL_final.replace(new RegExp(`\\$${i + 1}`), argAsStr);
		}
	}

	sqlText += lineSQL_final;
}

export default async function seed(knex: Knex) {
	AddRaw("-- NOTE: DO NOT MANUALLY MODIFY THIS FILE, AS IT IS AUTO-GENERATED. (modify GenerateSeedDB.ts instead)");
	AddRaw("\\set ON_ERROR_STOP 1");
	AddRaw("begin;"); // start transaction
	AddRaw("");

	// needed, since "maps" and "nodeRevisions" both have fk-refs to each other, so whichever is added first would error (without this flag)
	//AddRaw(knex.raw("SET CONSTRAINTS ALL DEFERRED;"));
	AddRaw("SET CONSTRAINTS ALL DEFERRED;");
	AddRaw("");

	console.log(`Adding seed-code for globalData entry...`);
	for (const globalData of Object.values(globalDatas)) {
		Add(knex("globalData").insert(globalData));
	}

	console.log(`Adding seed-code for users and userHiddens...`);
	for (const user of Object.values(users)) {
		Add(knex("users").insert(CE(user).ExcludeKeys("hidden")));
		Add(knex("userHiddens").insert(user.hidden));
	}

	console.log(`Adding seed-code for access-policies...`);
	for (const policy of Object.values(accessPolicies)) {
		Add(knex("accessPolicies").insert(policy));
	}

	console.log(`Adding seed-code for maps...`);
	for (const map of Object.values(maps)) {
		Add(knex("maps").insert(map));
	}

	console.log(`Adding seed-code for nodes and node-revisions...`);
	for (const node of Object.values(nodes)) {
		Add(knex("nodes").insert(CE(node).ExcludeKeys("revision")));
		Add(knex("nodeRevisions").insert(node.revision));
	}

	AddRaw("");
	AddRaw("commit;"); // end transaction

	writeFileSync("./Scripts/SeedDB/@SeedDB.sql", sqlText);
	console.log(`Done generating @SeedDB.sql script file.`);
}
const knexClient = KnexFunc({client: "postgresql"});
seed(knexClient);