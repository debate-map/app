// intercepted methods
// ==========

import {Knex} from "knex";

function InterceptMethods(knex: Knex.Transaction) {
	const createTable_orig = knex.schema.createTable;
	//knex.schema.createTable = createTable_custom;
	knex.schema.constructor.prototype.createTable = createTable_custom;
	function createTable_custom(...args) {
		const [tableName] = args;
		//console.log("Intercepted:", tableName);
		knex["_createdTables"] = (knex["_createdTables"] ?? []);
		knex["_createdTables"].push(tableName);
		return createTable_orig.apply(this, args);
	}
	Object.defineProperty(knex.schema, "createTable", {value: createTable_custom});
}

// added methods
// ==========

declare module "knex" {
	namespace Knex {
		interface ColumnBuilder {
			DeferRef: (this: Knex.ColumnBuilder)=>Knex.ColumnBuilder; 
		}
	}
}
const deferredReferences = [] as {fromTable: string, fromColumn: string, toTable: string, toColumn: string}[];
//Object.prototype["DeferRefs"] = DeferRefs;
Object.defineProperties(Object.prototype, {
	DeferRef: {value: DeferRef},
});
function DeferRef(this: Knex.ColumnBuilder): Knex.ColumnBuilder {
	//console.log("Test0:", this);
	const statements = this["_tableBuilder"]["_statements"] as any[];
	//console.log("Test1:", statements);
	
	const refInfo = statements.filter(a=>a.grouping == "alterTable" && a.method == "foreign").pop().args[0];
	const ref = {
		fromTable: this["_tableBuilder"]["_tableName"], fromColumn: refInfo.column,
		toTable: refInfo.inTable, toColumn: refInfo.references,
	};
	//console.log("Test2:", ref);

	statements.splice(statements.indexOf(refInfo), 1); // remove call that tries to set "references" flag; we're deferring to later
	deferredReferences.push(ref);

	return this;
}

// standalone functions
// ==========
const vPrefix = "v1_draft_";
function RemoveVPrefix(str: string) {
	return str.replace(vPrefix, "");
}

async function Start(knex: Knex.Transaction) {
	console.log("Starting");
	InterceptMethods(knex);

	//CreateDBIfNotExists("debate-map");
	// todo: add function-call to satify: "[this script should also automatically remove the entry for the latest migration from the `knex_migrations_lock` table, if it exists, so that you can keep rerunning it without blockage]"

	return {v: vPrefix};
}
type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
async function End(knex: Knex.Transaction, info: ThenArg<ReturnType<typeof Start>>) {
	console.log("Added deferred foreign-key constraints to tables...");
	for (const ref of deferredReferences) {
		//const constraintName = `fk @from(${RemoveVPrefix(ref.fromTable)}.${ref.fromColumn}) @to(${RemoveVPrefix(ref.toTable)}.${ref.toColumn})`;
		const constraintName = `fk @from(${ref.fromColumn}) @to(${RemoveVPrefix(ref.toTable)}.${ref.toColumn})`;
		await knex.schema.raw(`
			ALTER TABLE "${ref.fromTable}"
			ADD CONSTRAINT "${constraintName}"
			FOREIGN KEY ("${ref.fromColumn}") 
			REFERENCES "${ref.toTable}" ("${ref.toColumn}");
		`);
		/*await knex.schema.raw(`
			ALTER TABLE "${ref.fromTable}"
			ADD FOREIGN KEY ("${ref.fromColumn}") 
			REFERENCES "${ref.toTable}" ("${ref.toColumn}");
		`);*/
	}

	const createdTableNames = knex["_createdTables"] ?? [];
	console.log("Activating new tables by renaming to:", createdTableNames.map(RemoveVPrefix));
	for (const tableName of createdTableNames) {
		await knex.schema.renameTable(tableName, RemoveVPrefix(tableName));
	}

	console.log("Done");
}

// migration script
// ==========

export async function up(knex: Knex.Transaction) {
	const info = await Start(knex);
	const {v} = info;

	// used by generated code
	function RunFieldInit(tableBuilder: Knex.TableBuilder, fieldName: string, fieldInitFunc: (t: Knex.TableBuilder, n: string)=>any) {
		fieldInitFunc(tableBuilder, fieldName);
	}

	await knex.schema.createTable(`${v}accessPolicies`, t=>{
		RunFieldInit(t, "id", (t,n)=>t.text(n).primary());
		RunFieldInit(t, "name", (t,n)=>t.text(n).notNullable());
		RunFieldInit(t, "base", (t,n)=>t.text(n).references("id").inTable(v + `accessPolicies`).DeferRef());
		RunFieldInit(t, "permissions_base", (t,n)=>t.jsonb(n));
		RunFieldInit(t, "permissions_userExtends", (t,n)=>t.jsonb(n));
	});

	await knex.schema.createTable(`${v}mapNodeEdits`, t=>{
		RunFieldInit(t, "id", (t,n)=>t.text(n).primary());
		RunFieldInit(t, "map", (t,n)=>t.text(n).references("id").inTable(v + `maps`).DeferRef());
		RunFieldInit(t, "node", (t,n)=>t.text(n).references("id").inTable(v + `nodes`).DeferRef());
		RunFieldInit(t, "time", (t,n)=>t.bigInteger(n));
		RunFieldInit(t, "type", (t,n)=>t.text(n));
	});

	await knex.schema.createTable(`${v}maps`, t=>{
		RunFieldInit(t, "id", (t,n)=>t.text(n).primary());
		RunFieldInit(t, "accessPolicy", (t,n)=>t.text(n).references("id").inTable(v + `accessPolicies`).DeferRef());
		RunFieldInit(t, "name", (t,n)=>t.text(n));
		RunFieldInit(t, "note", (t,n)=>t.text(n));
		RunFieldInit(t, "noteInline", (t,n)=>t.boolean(n));
		RunFieldInit(t, "type", (t,n)=>t.text(n));
		RunFieldInit(t, "rootNode", (t,n)=>t.text(n).references("id").inTable(v + `nodes`).DeferRef());
		RunFieldInit(t, "defaultExpandDepth", (t,n)=>t.integer(n));
		RunFieldInit(t, "requireMapEditorsCanEdit", (t,n)=>t.boolean(n));
		RunFieldInit(t, "nodeDefaults", (t,n)=>t.jsonb(n));
		RunFieldInit(t, "featured", (t,n)=>t.boolean(n));
		RunFieldInit(t, "editors", (t,n)=>t.specificType(n, "text[]"));
		RunFieldInit(t, "creator", (t,n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t,n)=>t.bigInteger(n));
		RunFieldInit(t, "edits", (t,n)=>t.integer(n));
		RunFieldInit(t, "editedAt", (t,n)=>t.bigInteger(n));
	});

	await knex.schema.createTable(`${v}medias`, t=>{
		RunFieldInit(t, "id", (t,n)=>t.text(n).primary());
		RunFieldInit(t, "accessPolicy", (t,n)=>t.text(n).references("id").inTable(v + `accessPolicies`).DeferRef());
		RunFieldInit(t, "creator", (t,n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t,n)=>t.bigInteger(n));
		RunFieldInit(t, "name", (t,n)=>t.text(n));
		RunFieldInit(t, "type", (t,n)=>t.text(n));
		RunFieldInit(t, "url", (t,n)=>t.text(n));
		RunFieldInit(t, "description", (t,n)=>t.text(n));
	});

	await knex.schema.createTable(`${v}nodeChildLinks`, t=>{
		RunFieldInit(t, "id", (t,n)=>t.text(n).notNullable().primary());
		RunFieldInit(t, "parent", (t,n)=>t.text(n).notNullable().references("id").inTable(v + `nodes`).DeferRef());
		RunFieldInit(t, "child", (t,n)=>t.text(n).notNullable().references("id").inTable(v + `nodes`).DeferRef());
		RunFieldInit(t, "slot", (t,n)=>t.integer(n));
		RunFieldInit(t, "form", (t,n)=>t.text(n));
		RunFieldInit(t, "seriesAnchor", (t,n)=>t.boolean(n));
		RunFieldInit(t, "seriesEnd", (t,n)=>t.boolean(n));
		RunFieldInit(t, "polarity", (t,n)=>t.text(n));
	});

	await knex.schema.createTable(`${v}nodeRatings`, t=>{
		RunFieldInit(t, "id", (t,n)=>t.text(n).primary());
		RunFieldInit(t, "accessPolicy", (t,n)=>t.text(n).references("id").inTable(v + `accessPolicies`).DeferRef());
		RunFieldInit(t, "node", (t,n)=>t.text(n).references("id").inTable(v + `nodes`).DeferRef());
		RunFieldInit(t, "type", (t,n)=>t.text(n));
		RunFieldInit(t, "user", (t,n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "editedAt", (t,n)=>t.bigInteger(n));
		RunFieldInit(t, "value", (t,n)=>t.float(n));
	});

	await knex.schema.createTable(`${v}nodes`, t=>{
		
		RunFieldInit(t, "id", (t,n)=>t.text(n).primary());
		RunFieldInit(t, "accessPolicy", (t,n)=>t.text(n).references("id").inTable(v + `accessPolicies`).DeferRef());
		RunFieldInit(t, "creator", (t,n)=>t.text(n).notNullable().references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t,n)=>t.bigInteger(n).notNullable());
		RunFieldInit(t, "type", (t,n)=>t.text(n).notNullable());
		RunFieldInit(t, "argumentType", (t,n)=>t.text(n));
		RunFieldInit(t, "multiPremiseArgument", (t,n)=>t.boolean(n));
		RunFieldInit(t, "rootNodeForMap", (t,n)=>t.text(n).references("id").inTable(v + `maps`).DeferRef());
	});

	await knex.schema.createTable(`${v}nodeRevisions`, t=>{
		RunFieldInit(t, "id", (t,n)=>t.text(n).primary());
		RunFieldInit(t, "node", (t,n)=>t.text(n).notNullable().references("id").inTable(v + `nodes`).DeferRef());
		RunFieldInit(t, "creator", (t,n)=>t.text(n).notNullable().references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t,n)=>t.bigInteger(n).notNullable());
		RunFieldInit(t, "titles", (t,n)=>t.jsonb(n));
		RunFieldInit(t, "note", (t,n)=>t.text(n));
		RunFieldInit(t, "displayDetails", (t,n)=>t.jsonb(n));
		RunFieldInit(t, "termAttachments", (t,n)=>t.specificType(n, "text[]"));
		RunFieldInit(t, "equation", (t,n)=>t.jsonb(n));
		RunFieldInit(t, "references", (t,n)=>t.jsonb(n));
		RunFieldInit(t, "quote", (t,n)=>t.jsonb(n));
		RunFieldInit(t, "media", (t,n)=>t.jsonb(n));
	});

	await knex.schema.createTable(`${v}nodeTags`, t=>{
		RunFieldInit(t, "id", (t,n)=>t.text(n).primary());
		RunFieldInit(t, "creator", (t,n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t,n)=>t.bigInteger(n));
		RunFieldInit(t, "nodes", (t,n)=>t.specificType(n, "text[]"));
		RunFieldInit(t, "mirrorChildrenFromXToY", (t,n)=>t.jsonb(n));
		RunFieldInit(t, "xIsExtendedByY", (t,n)=>t.jsonb(n));
		RunFieldInit(t, "mutuallyExclusiveGroup", (t,n)=>t.jsonb(n));
		RunFieldInit(t, "restrictMirroringOfX", (t,n)=>t.jsonb(n));
	});

	await knex.schema.createTable(`${v}shares`, t=>{
		RunFieldInit(t, "id", (t,n)=>t.text(n).primary());
		RunFieldInit(t, "creator", (t,n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t,n)=>t.bigInteger(n));
		RunFieldInit(t, "name", (t,n)=>t.text(n));
		RunFieldInit(t, "type", (t,n)=>t.text(n));
		RunFieldInit(t, "mapID", (t,n)=>t.text(n));
		RunFieldInit(t, "mapView", (t,n)=>t.jsonb(n));
	});

	await knex.schema.createTable(`${v}terms`, t=>{
		RunFieldInit(t, "id", (t,n)=>t.text(n).primary());
		RunFieldInit(t, "creator", (t,n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t,n)=>t.bigInteger(n));
		RunFieldInit(t, "name", (t,n)=>t.text(n));
		RunFieldInit(t, "forms", (t,n)=>t.specificType(n, "text[]"));
		RunFieldInit(t, "disambiguation", (t,n)=>t.text(n));
		RunFieldInit(t, "type", (t,n)=>t.text(n));
		RunFieldInit(t, "definition", (t,n)=>t.text(n));
		RunFieldInit(t, "note", (t,n)=>t.text(n));
	});

	await knex.schema.createTable(`${v}users`, t=>{
		RunFieldInit(t, "id", (t,n)=>t.text(n).primary());
		RunFieldInit(t, "displayName", (t,n)=>t.text(n));
		RunFieldInit(t, "photoURL", (t,n)=>t.text(n));
		RunFieldInit(t, "joinDate", (t,n)=>t.bigInteger(n));
		RunFieldInit(t, "permissionGroups", (t,n)=>t.jsonb(n));
		RunFieldInit(t, "edits", (t,n)=>t.integer(n));
		RunFieldInit(t, "lastEditAt", (t,n)=>t.bigInteger(n));
	});

	await knex.schema.createTable(`${v}usersPrivates`, t=>{
		RunFieldInit(t, "id", (t,n)=>t.text(n).primary());
		RunFieldInit(t, "email", (t,n)=>t.text(n));
		RunFieldInit(t, "providerData", (t,n)=>t.jsonb(n));
		RunFieldInit(t, "backgroundID", (t,n)=>t.text(n));
		RunFieldInit(t, "backgroundCustom_enabled", (t,n)=>t.boolean(n));
		RunFieldInit(t, "backgroundCustom_color", (t,n)=>t.text(n));
		RunFieldInit(t, "backgroundCustom_url", (t,n)=>t.text(n));
		RunFieldInit(t, "backgroundCustom_position", (t,n)=>t.text(n));
	});

	await knex.schema.createTable(`${v}visibilityDirectives`, t=>{
		RunFieldInit(t, "id", (t,n)=>t.text(n).primary());
		RunFieldInit(t, "actor", (t,n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "priority", (t,n)=>t.float(n));
		RunFieldInit(t, "context", (t,n)=>t.specificType(n, "text[]"));
		RunFieldInit(t, "target_map", (t,n)=>t.text(n).references("id").inTable(v + `maps`).DeferRef());
		RunFieldInit(t, "target_node", (t,n)=>t.text(n).references("id").inTable(v + `nodes`).DeferRef());
		RunFieldInit(t, "target_nodeChildLink", (t,n)=>t.text(n).references("id").inTable(v + `nodeChildLinks`).DeferRef());
		RunFieldInit(t, "visibility_self", (t,n)=>t.text(n));
		RunFieldInit(t, "visibility_nodes", (t,n)=>t.text(n));
	});

	await End(knex, info);
}
/*export function down() {
	throw new Error("Not implemented.");
}*/