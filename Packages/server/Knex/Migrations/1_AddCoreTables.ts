// intercepted methods
// ==========

function InterceptMethods(knex: Knex_Transaction) {
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

interface Object {
	DeferRef: typeof DeferRef;
}
const deferredReferences = [] as {fromTable: string, fromColumn: string, toTable: string, toColumn: string}[];
//Object.prototype["DeferRefs"] = DeferRefs;
Object.defineProperties(Object.prototype, {
	DeferRef: {value: DeferRef},
});
function DeferRef(this: Knex_ColumnBuilder): Knex_ColumnBuilder {
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

async function Start(knex: Knex_Transaction) {
	console.log("Starting");
	InterceptMethods(knex);

	//CreateDBIfNotExists("debate-map");
	// todo: add function-call to satify: "[this script should also automatically remove the entry for the latest migration from the `knex_migrations_lock` table, if it exists, so that you can keep rerunning it without blockage]"

	return {v: vPrefix};
}
type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
async function End(knex: Knex_Transaction, info: ThenArg<ReturnType<typeof Start>>) {
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

//export async function up(knex: Knex_Transaction) {
module.exports.up = async(knex: Knex_Transaction)=>{
	const info = await Start(knex);
	const {v} = info;

	await knex.schema.createTable(`${v}accessPolicies`, t=>{
		t.text("id").primary();
		t.text("base").references("id").inTable(`${v}accessPolicies`).DeferRef(); // max-depth: ~3
		//AddRef_Deferred(`${v}accessPolicies`, "base", `${v}accessPolicies`, "id");
		t.jsonb("permissions_base"); // Partial<PermissionSet>
		t.jsonb("permissions_userExtends"); // Partial<PermissionSet>
	});

	await knex.schema.createTable(`${v}visibilityDirectives`, t=>{
		t.text("id").primary();
		t.text("actor").references("id").inTable(`${v}users`).DeferRef();
		t.float("priority");
		t.specificType("context", "text[]"); // ie. actor only wants the directive to apply in the given context (eg. hide this node, when outside of this closed map)

		t.text("target_map").references("id").inTable(`${v}maps`).DeferRef(); // eg. for curator marking node as spam/trash
		t.text("target_node").references("id").inTable(`${v}nodes`).DeferRef(); // eg. for curator marking node as spam/trash
		//t.text("target_nodeRevision").references("id").inTable(`${v}nodeRevisions`); // eg. for curator marking node-revision as spam/trash (commented for now, as keeping spam revisions in list is ok)
		t.text("target_nodeParent_nodeChildren").references("id").inTable(`${v}nodeParent_nodeChildren`).DeferRef(); // eg. for curator marking parent->child link as spam/trash

		// visibility values: show, hide, trash
		t.text("visibility_self"); // for target above
		t.text("visibility_nodes"); // for any node shown within the map (if map) [eg. "hide all nodes, other than those explicitly accepted/whitelisted", ie. "closed maps"]
	});
	
	await knex.schema.createTable(`${v}medias`, t=>{
		t.text("id").primary();
		t.text("accessPolicy").references("id").inTable(`${v}accessPolicies`).DeferRef();
		t.text("creator").references("id").inTable(`${v}users`).DeferRef();
		t.bigInteger("createdAt");
		t.text("name");
		t.text("type");
		t.text("url");
		t.text("description");
	});

	//await knex.schema.createTable(`${v}layers`, t=>{}); // add later

	await knex.schema.createTable(`${v}maps`, t=>{
		t.text("id").primary();
		t.text("accessPolicy").references("id").inTable(`${v}accessPolicies`).DeferRef();
		t.text("name");
		t.text("note");
		t.boolean("noteInline");
		t.text("type");
		t.text("rootNode").references("id").inTable(`${v}nodes`).DeferRef();
		t.integer("defaultExpandDepth");
		//t.text("defaultTimelineID");
		t.boolean("requireMapEditorsCanEdit");
		t.jsonb("nodeDefaults");
		t.boolean("featured");
		t.specificType("editors", "text[]");

		t.text("creator").references("id").inTable(`${v}users`).DeferRef();
		t.bigInteger("createdAt");
		t.integer("edits");
		t.bigInteger("editedAt");

		//t.specificType("layers", "text[]");
		//t.specificType("timelines", "text[]");
	});

	await knex.schema.createTable(`${v}map_nodeEdits`, t=>{
		// uses map's access-policy
		t.text("map").references("id").inTable(`${v}maps`).DeferRef();
		t.text("node").references("id").inTable(`${v}nodes`).DeferRef();
		t.text("time");
		//t.text("userID");
	});

	await knex.schema.createTable(`${v}nodes`, t=>{
		t.comment("@name MapNode"); // avoids conflict with the default "Node" type that Postgraphile defines for Relay
		t.text("id").primary();
		t.text("accessPolicy").references("id").inTable(`${v}accessPolicies`).DeferRef();
		t.text("type");
		t.text("creator").references("id").inTable(`${v}users`).DeferRef();
		t.bigInteger("createdAt");
		t.text("rootNodeForMap").references("id").inTable(`${v}maps`).DeferRef();
	});

	await knex.schema.createTable(`${v}nodeRatings`, t=>{
		t.text("id").primary();
		t.text("accessPolicy").references("id").inTable(`${v}accessPolicies`).DeferRef();
		t.text("node").references("id").inTable(`${v}nodes`).DeferRef();
		t.text("type");
		t.text("user").references("id").inTable(`${v}users`).DeferRef();
		t.bigInteger("editedAt");
		t.float("value");
	});

	await knex.schema.createTable(`${v}nodeRevisions`, t=>{
		// uses node's access-policy
		t.text("id").primary();
		t.text("node").references("id").inTable(`${v}nodes`).DeferRef();
		t.text("creator").references("id").inTable(`${v}users`).DeferRef();
		t.bigInteger("createdAt");
		t.jsonb("titles");
		// todo: add system so that people can propose and vote on alternative phrasings (not sure of details yet)
		t.text("note");
		t.jsonb("displayDetails"); // fontSizeOverride, widthOverride

		t.text("argumentType");
		t.boolean("multiPremiseArgument");
		t.boolean("votingEnabled").defaultTo(true);

		t.specificType("termAttachments", "text[]");
		t.jsonb("equation");
		t.jsonb("references");
		t.jsonb("quote");
		t.jsonb("media");
	});

	await knex.schema.createTable(`${v}nodeParent_nodeChildren`, t=>{
		// uses access-policy of both parent-node and child-node (both must pass)
		t.text("id").primary();
		t.text("parent").references("id").inTable(`${v}nodes`).DeferRef();
		t.text("child").references("id").inTable(`${v}nodes`).DeferRef();
		//t.text("type"); // claim_premise (argument->claim), argument_truth (claim->argument), argument_relevance (argument->argument), note (?->note)
		t.integer("slot"); // multiple parent->child entries can have the same slot; in that case, the UI displays (in that slot) the one entry with the highest "priority" (criteria configurable by user)
	});

	await knex.schema.createTable(`${v}nodeTags`, t=>{
		// uses node's access-policy
		t.text("id").primary();
		t.text("creator").references("id").inTable(`${v}users`).DeferRef();
		t.bigInteger("createdAt");
		t.specificType("nodes", "text[]");

		t.jsonb("mirrorChildrenFromXToY");
		t.jsonb("xIsExtendedByY");
		t.jsonb("mutuallyExclusiveGroup");
		t.jsonb("restrictMirroringOfX");
	});

	await knex.schema.createTable(`${v}shares`, t=>{
		// uses target's (ie. map's) access-policy
		t.text("id").primary();
		t.text("creator").references("id").inTable(`${v}users`).DeferRef();
		t.bigInteger("createdAt");
		t.text("name");
		t.text("type");

		t.text("map");
		t.jsonb("mapView");
	});

	await knex.schema.createTable(`${v}terms`, t=>{
		// uses node's access-policy
		t.text("id").primary();
		t.text("creator").references("id").inTable(`${v}users`).DeferRef();
		t.bigInteger("createdAt");

		t.text("name");
		t.specificType("forms", "text[]");
		t.text("disambiguation");
		t.text("type");

		t.text("definition");
		t.text("note");
	});

	await knex.schema.createTable(`${v}users`, t=>{
		t.text("id").primary();
		t.text("displayName");
		t.text("photoURL");

		t.bigInteger("joinDate");
		t.specificType("permissionGroups", "text[]");
		t.integer("edits");
		t.bigInteger("lastEditAt");
	});

	await knex.schema.createTable(`${v}users_private`, t=>{
		t.text("id").primary();
		t.text("email");
		t.jsonb("providerData");

		t.text("backgroundID");
		t.boolean("backgroundCustom_enabled");
		t.text("backgroundCustom_color");
		t.text("backgroundCustom_url");
		t.text("backgroundCustom_position");
	});

	await End(knex, info);
};
module.exports.down = ()=>{
	throw new Error("Not implemented.");
};