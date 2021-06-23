//export async function up(knex: Knex) {
module.exports.up = async(knex: Knex)=>{
	console.log("Starting");
	//CreateDBIfNotExists("debate-map");
	// todo: add function-call to satify: "[this script should also automatically remove the entry for the latest migration from the `knex_migrations_lock` table, if it exists, so that you can keep rerunning it without blockage]"
	const v = "v1_draft_";

	await knex.schema.createTable(`${v}accessibilityPolicies`, t=>{
		t.text("id");
		t.text("base").references("id").inTable("accessibilityPolicies"); // max-depth: ?
		// todo
	});

	await knex.schema.createTable(`${v}visibilityDirectives`, t=>{
		t.text("id");
		t.text("actor").references("id").inTable("users");
		t.float("priority");
		t.specificType("context", "string[]"); // ie. actor only wants the directive to apply in the given context (eg. hide this node, when outside of this closed map)

		t.text("target_map").references("id").inTable("maps"); // eg. for curator marking node as spam/trash
		t.text("target_node").references("id").inTable("nodes"); // eg. for curator marking node as spam/trash
		//t.text("target_nodeRevision").references("id").inTable("nodeRevisions"); // eg. for curator marking node-revision as spam/trash (commented for now, as keeping spam revisions in list is ok)
		t.text("target_nodeParent_nodeChildren").references("id").inTable("nodeParent_nodeChildren"); // eg. for curator marking parent->child link as spam/trash

		// visibility values: show, hide, trash
		t.text("visibility_self"); // for target above
		t.text("visibility_nodes"); // for any node shown within the map (if map) [eg. "hide all nodes, other than those explicitly accepted/whitelisted", ie. "closed maps"]
	});
	
	await knex.schema.createTable(`${v}medias`, t=>{
		t.text("accessibilityPolicy").references("id").inTable("accessibilityPolicies");
		t.text("id");
		t.text("creator").references("id").inTable("users");
		t.bigInteger("createdAt");
		t.text("name");
		t.text("type");
		t.text("url");
		t.text("description");
	});

	//await knex.schema.createTable(`${v}layers`, t=>{}); // add later

	await knex.schema.createTable(`${v}maps`, t=>{
		t.text("accessibilityPolicy").references("id").inTable("accessibilityPolicies");
		t.text("id");
		t.text("name");
		t.text("note");
		t.boolean("noteInline");
		t.text("type");
		t.text("rootNode").references("id").inTable("nodes");
		t.integer("defaultExpandDepth");
		//t.text("defaultTimelineID");
		t.boolean("requireMapEditorsCanEdit");
		t.jsonb("nodeDefaults");
		t.boolean("featured");
		t.specificType("editors", "text[]");

		t.text("creator").references("id").inTable("users");
		t.bigInteger("createdAt");
		t.integer("edits");
		t.bigInteger("editedAt");

		//t.specificType("layers", "text[]");
		//t.specificType("timelines", "text[]");
	});

	await knex.schema.createTable(`${v}map_nodeEdits`, t=>{
		// uses map's accessibility-policy
		t.text("map").references("id").inTable("maps");
		t.text("node").references("id").inTable("nodes");
		t.text("time");
		//t.text("userID");
	});

	await knex.schema.createTable(`${v}nodes`, t=>{
		t.text("accessibilityPolicy").references("id").inTable("accessibilityPolicies");
		t.text("id");
		t.text("type");
		t.text("creator").references("id").inTable("users");
		t.bigInteger("createdAt");
		t.text("rootNodeForMap").references("id").inTable("maps");
	});

	await knex.schema.createTable(`${v}nodeRatings`, t=>{
		t.text("accessibilityPolicy").references("id").inTable("accessibilityPolicies");
		t.text("id");
		t.text("node").references("id").inTable("nodes");
		t.text("type");
		t.text("user").references("id").inTable("users");
		t.bigInteger("editedAt");
		t.float("value");
	});

	await knex.schema.createTable(`${v}nodeRevisions`, t=>{
		// uses node's accessibility-policy
		t.text("id");
		t.text("node").references("id").inTable("nodes");
		t.text("creator").references("id").inTable("users");
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
		// uses accessibility-policy of both parent-node and child-node (both must pass)
		t.text("id");
		t.text("parent").references("id").inTable("nodes");
		t.text("child").references("id").inTable("nodes");
		//t.text("type"); // claim_premise (argument->claim), argument_truth (claim->argument), argument_relevance (argument->argument), note (?->note)
		t.integer("slot"); // multiple parent->child entries can have the same slot; in that case, the UI displays (in that slot) the one entry with the highest "priority" (criteria configurable by user)
	});

	await knex.schema.createTable(`${v}nodeTags`, t=>{
		// uses node's accessibility-policy
		t.text("id");
		t.text("creator").references("id").inTable("users");
		t.bigInteger("createdAt");
		t.specificType("nodes", "text[]");

		t.jsonb("mirrorChildrenFromXToY");
		t.jsonb("xIsExtendedByY");
		t.jsonb("mutuallyExclusiveGroup");
		t.jsonb("restrictMirroringOfX");
	});

	await knex.schema.createTable(`${v}shares`, t=>{
		// uses target's (ie. map's) accessibility-policy
		t.text("id");
		t.text("creator").references("id").inTable("users");
		t.bigInteger("createdAt");
		t.text("name");
		t.text("type");

		t.text("map");
		t.jsonb("mapView");
	});

	await knex.schema.createTable(`${v}terms`, t=>{
		// uses node's accessibility-policy
		t.text("id");
		t.text("creator").references("id").inTable("users");
		t.bigInteger("createdAt");

		t.text("name");
		t.specificType("forms", "text[]");
		t.text("disambiguation");
		t.text("type");

		t.text("definition");
		t.text("note");
	});

	await knex.schema.createTable(`${v}users`, t=>{
		t.text("id");
		t.text("displayName");
		t.text("photoURL");

		t.bigInteger("joinDate");
		t.specificType("permissionGroups", "text[]");
		t.integer("edits");
		t.bigInteger("lastEditAt");
	});

	await knex.schema.createTable(`${v}users_private`, t=>{
		t.text("id");
		t.text("email");
		t.jsonb("providerData");

		t.text("backgroundID");
		t.boolean("backgroundCustom_enabled");
		t.text("backgroundCustom_color");
		t.text("backgroundCustom_url");
		t.text("backgroundCustom_position");
	});

	console.log("Done");
};
module.exports.down = ()=>{
	throw new Error("Not implemented.");
};