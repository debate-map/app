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

// copied from mobx-graphlink (Decorators.ts)
// ==========

// todo: move as much of the code in this file as possible into mobx-graphlink (not sure of the ideal approach...)
declare module "knex" {
	namespace Knex {
		interface ColumnBuilder {
			DeferRef: (this: Knex.ColumnBuilder, opts?: DeferRef_Options)=>Knex.ColumnBuilder;
		}
	}
}
export type DeferRef_Options = {enforceAtTransactionEnd?: boolean};

// added methods
// ==========

const deferredReferences = [] as {fromTable: string, fromColumn: string, toTable: string, toColumn: string, enforceAtTransactionEnd: boolean}[];
//Object.prototype["DeferRefs"] = DeferRefs;
Object.defineProperties(Object.prototype, {
	DeferRef: {value: DeferRef},
});
function DeferRef(this: Knex.ColumnBuilder, opts?: DeferRef_Options): Knex.ColumnBuilder {
	//console.log("Test0:", this);
	const statements = this["_tableBuilder"]["_statements"] as any[];
	//console.log("Test1:", statements);

	const refInfo = statements.filter(a=>a.grouping == "alterTable" && a.method == "foreign").pop().args[0];
	const ref = {
		fromTable: this["_tableBuilder"]["_tableName"], fromColumn: refInfo.column,
		toTable: refInfo.inTable, toColumn: refInfo.references,
		enforceAtTransactionEnd: opts?.enforceAtTransactionEnd ?? false,
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

	// create custom english dictionary, with all stop-words excluded; this makes searching a bit more powerful, by letting you include/exclude words like "the", "other", "might", "over", etc.
	await knex.raw(`
		create text search dictionary english_stem_nostop (
			Template = snowball,
			Language = english
		);

		create text search configuration public.english_nostop (COPY = pg_catalog.english);
		alter text search configuration public.english_nostop
			alter mapping for asciiword, asciihword, hword_asciipart, hword, hword_part, word with english_stem_nostop;
	`);

	return {v: vPrefix};
}
type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
async function End(knex: Knex.Transaction, info: ThenArg<ReturnType<typeof Start>>) {
	console.log("Added deferred foreign-key constraints to tables...");
	for (const ref of deferredReferences) {
		//const constraintName = `fk @from(${RemoveVPrefix(ref.fromTable)}.${ref.fromColumn}) @to(${RemoveVPrefix(ref.toTable)}.${ref.toColumn})`;
		const constraintName = `fk @from(${ref.fromColumn}) @to(${RemoveVPrefix(ref.toTable)}.${ref.toColumn})`;
		await knex.schema.raw(`
			alter table "${ref.fromTable}"
			add constraint "${constraintName}"
			foreign key ("${ref.fromColumn}") 
			references "${ref.toTable}" ("${ref.toColumn}")
			${ref.enforceAtTransactionEnd ? "deferrable initially deferred;" : "deferrable initially immediate;"}
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

	// set up indexes
	await knex.raw(`
		create index on "nodeRevisions"
		using gin (phrasing_tsvector);
	`);

	// set up app_user role for postgraphile connection, set up RLS, etc.
	await knex.raw(`
		do $$ begin
			create role app_user with nologin;
		end $$;
		grant connect on database "debate-map" to app_user;
		grant usage on schema app_public to app_user;
		--grant all on schema app_public to app_user;

		--alter default privileges in schema app_public grant select, insert, update, delete on tables to app_user;
		-- loop through all tables, granting permissions (the above doesn't work, because the "default permissions" are only used for future tables that are made)
		grant select, insert, update, delete on all tables in schema app_public to app_user;

		-- field collation fixes (ideal would be to, database-wide, have collation default to case-sensitive, but for now we just do it for a few key fields for which "ORDER BY" clauses exist)
		ALTER TABLE "nodeChildLinks" ALTER COLUMN "orderKey" SET DATA TYPE TEXT COLLATE "C"
		ALTER TABLE "nodeChildLinks" ALTER COLUMN "id" SET DATA TYPE TEXT COLLATE "C"

		-- indexes
		create index nodeChildLinks_parent_child on app_public."nodeChildLinks" (parent, child);

		-- helper functions (eg. optimized tree-traversal)
		CREATE OR REPLACE FUNCTION encode_uuid(id UUID) RETURNS varchar(22) LANGUAGE SQL IMMUTABLE AS $$1
			SELECT replace(replace(
			trim(trailing "=" FROM encode(decode(replace(gen_random_uuid()::text, "-", ""), "hex"), "base64"))
			, "+", "-"), "/", "_");
		$$;
		CREATE OR REPLACE FUNCTION decode_uuid(id text) RETURNS UUID LANGUAGE SQL IMMUTABLE AS $$
			SELECT encode(decode(
				replace(replace(id, "_", "/"), "-", "+") || substr("==", 1, (33-length(id)) % 3), "base64"), "hex")::uuid;
		$$;

		CREATE OR REPLACE FUNCTION descendants(root text, max_depth INTEGER DEFAULT 5)
		RETURNS TABLE(id text, link_id text, distance INTEGER) LANGUAGE SQL STABLE AS $$
			SELECT root as id, null as link_id, 0 as depth
			UNION ALL (
			WITH RECURSIVE children(id, depth, is_cycle, nodes_path, order_key, link_id) AS (
				SELECT
					p.child, 1, false, ARRAY[p.parent], p."orderKey", p.id
				FROM
					app_public."nodeChildLinks" AS p
				WHERE
					p.parent=root
				UNION
					SELECT
						c.child, children.depth+1, c.child = ANY(children.nodes_path), nodes_path || c.parent, c."orderKey", c.id
					FROM
						app_public."nodeChildLinks" AS c, children
					WHERE c.parent = children.id AND NOT is_cycle AND children.depth < max_depth
			) SELECT
				min(id) as id, link_id, min(depth) as depth
			FROM
				children
			 GROUP BY (link_id)
			 ORDER BY min(depth), min(order_key), link_id)
		$$;
		-- todo: update this
		CREATE OR REPLACE FUNCTION ancestors(root text, max_depth INTEGER DEFAULT 5)
		RETURNS TABLE(id text, distance INTEGER) LANGUAGE SQL STABLE AS $$
			SELECT root as id, 0 as depth
			UNION ALL (
				WITH RECURSIVE parents(id, depth, is_cycle, nodes_path) AS (
					SELECT
						p.parent, 1, false, ARRAY[p.child]
					FROM
						app_public."nodeChildLinks" AS p
					WHERE
						p.child=root
					UNION
						SELECT
							c.parent, parents.depth+1, c.parent = ANY(parents.nodes_path), nodes_path || c.child
						FROM
							app_public."nodeChildLinks" AS c, parents
						WHERE c.child = parents.id AND NOT is_cycle AND parents.depth < max_depth
				) SELECT
					id, min(depth) as depth
				FROM
					parents
				GROUP BY id
				ORDER BY depth, id
			)
		$$;
		CREATE OR REPLACE FUNCTION shortest_path(source text, dest text)
		RETURNS TABLE(node_id text, link_id text) LANGUAGE plpgsql STABLE AS $$
		DECLARE
			node_ids text[];
			link_ids text[];
				seq integer[];
		BEGIN
			WITH RECURSIVE parents(link, parent, child, depth, is_cycle, nodes_path, links_path) AS (
				SELECT
					p.id, p.parent, p.child, 0, false, ARRAY[p.child], ARRAY[p.id]
				FROM
					app_public."nodeChildLinks" AS p
				WHERE
					p.child=dest
				UNION
					SELECT
						c.id, c.parent, c.child, parents.depth+1, c.parent = ANY(nodes_path), nodes_path || c.child, links_path || c.id
					FROM
						app_public."nodeChildLinks" AS c, parents
					WHERE c.child = parents.parent AND NOT is_cycle
			) SELECT
				parents.nodes_path, parents.links_path INTO STRICT node_ids, link_ids
			FROM
				parents
			WHERE parents.parent = source
			ORDER BY depth DESC LIMIT 1;
				SELECT array_agg(gs.val order by gs.val) INTO STRICT seq from generate_series(0, array_length(node_ids, 1)) gs(val);
			RETURN QUERY SELECT t.node_id, t.link_id FROM unnest(node_ids || source, ARRAY[null]::text[] || link_ids, seq) AS t(node_id, link_id, depth) ORDER by t.depth DESC;
		END
		$$;

		-- variant of descendants that tries to order the results in a way that mimics the render-order in debate-map (ie. traverse down at each step doing: stable-sort by link-id, then stable-sort by order-key)
		CREATE OR REPLACE FUNCTION descendants2(root text, max_depth INTEGER DEFAULT 5)
		RETURNS TABLE(id text, link_id text, distance INTEGER) LANGUAGE SQL STABLE AS $$
			WITH sub AS (
			SELECT null as parent_id, root as child_id, 0 as depth, null as order_key, null as link_id
			UNION ALL (
			WITH RECURSIVE children(parent_id, child_id, depth, is_cycle, nodes_path, order_key, link_id) AS (
				SELECT
					p.parent, p.child, 1, false, ARRAY[p.parent], p."orderKey", p.id
				FROM
					app_public."nodeChildLinks" AS p
				WHERE
					p.parent=root
				UNION
					SELECT
						c.parent, c.child, children.depth+1, c.child = ANY(children.nodes_path), nodes_path || c.parent, c."orderKey", c.id
					FROM
						app_public."nodeChildLinks" AS c, children
					WHERE c.parent = children.child_id AND NOT is_cycle AND children.depth < max_depth
			) SELECT DISTINCT ON (link_id) parent_id, child_id, depth, order_key, link_id
			FROM
				children
			ORDER BY link_id, depth))
			SELECT child_id as id, link_id, depth FROM sub ORDER BY sub.depth, sub.parent_id, sub.order_key, sub.link_id
		$$;

		-- RLS helper functions

		create or replace function IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess(entry_creator varchar, policyID varchar, policyField varchar) returns boolean as $$ begin 
			return (
				current_setting('app.current_user_id') = entry_creator
				or current_setting('app.current_user_admin') = 'true'
				/*or (
					policyFields[0] -> policyField -> 'access' = 'true'
					or policyFields[1] -> current_setting('app.current_user_id') -> policyField -> 'access' = 'true'
				)*/
				or exists (
					select 1 from app_public."accessPolicies" where id = policyID and (
						(
							"permissions" -> policyField -> 'access' = 'true'
							-- the coalesce is needed to handle the case where the deep-field at that path doesn't exist, apparently
							and coalesce("permissions_userExtends" -> current_setting('app.current_user_id') -> policyField -> 'access', 'null'::jsonb) != 'false'
						)
						or "permissions_userExtends" -> current_setting('app.current_user_id') -> policyField -> 'access' = 'true'
					)
				)
			);
		end $$ language plpgsql;

		create or replace function CanCurrentUserAccessAllNodesInArray(nodes varchar[]) returns boolean as $$
		declare
			node varchar;
		begin 
			foreach node in array nodes loop
				if not IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.nodes where id = node), 'nodes') then
					return false;
				end if;
			end loop;
			return true;
		end $$ language plpgsql;




		-- set of changes needed for new local_search implementation

		-- these commented, since handled by @DB(...)
		-- alter table app_public."nodeRevisions" add column replaced_by text;
		-- alter table app_public."nodeRevisions" add constraint "fk @from(replaced_by) @to(nodeRevisions.id)" FOREIGN KEY (replaced_by) REFERENCES "nodeRevisions" (id);

		ALTER TABLE app_public."nodeRevisions" ADD COLUMN phrasing1_tsvector tsvector GENERATED ALWAYS AS (rev_phrasing_to_tsv(phrasing)) STORED NOT NULL;
		ALTER TABLE app_public."nodeRevisions" ADD COLUMN attachments_tsvector tsvector GENERATED ALWAYS AS (attachments_to_tsv(attachments)) STORED NOT NULL;
		ALTER TABLE app_public."nodePhrasings" ADD COLUMN phrasing_tsvector tsvector GENERATED ALWAYS AS (phrasings_to_tsv(text_base, text_question)) STORED NOT NULL;

		CREATE OR REPLACE FUNCTION app_public.after_insert_node_revision() RETURNS TRIGGER LANGUAGE plpgsql AS $$
		DECLARE rev_id text;
		BEGIN
			SELECT id INTO rev_id FROM app_public."nodeRevisions" nr WHERE node = NEW.node AND "createdAt" < NEW."createdAt" ORDER BY "createdAt" DESC LIMIT 1;
			IF rev_id IS NOT NULL THEN
				UPDATE app_public."nodeRevisions" SET replaced_by = NEW.id WHERE id = rev_id;
			END IF;
			RETURN NEW;
		END$$;

		CREATE TRIGGER after_insert_node_revision AFTER INSERT ON app_public."nodeRevisions" FOR EACH ROW EXECUTE FUNCTION app_public.after_insert_node_revision();






		-- search-related indexes/functions

		CREATE OR REPLACE FUNCTION pick_phrasing(base TEXT, question TEXT) RETURNS TEXT AS $$
			SELECT (CASE
				WHEN base IS NOT NULL AND length(base) > 0 AND regexp_match(base, '\\[Paragraph [0-9]\\]') IS NULL THEN base
				WHEN question IS NOT NULL AND length(question) > 0 AND regexp_match(question, '\\[Paragraph [0-9]\\]') IS NULL THEN question 
				ELSE ''
				END)
		$$ LANGUAGE SQL IMMUTABLE;


		CREATE OR REPLACE FUNCTION phrasings_to_tsv(base TEXT, question TEXT) RETURNS tsvector AS $$
		SELECT to_tsvector('public.english_nostop'::regconfig, pick_phrasing(base, question));
		$$ LANGUAGE SQL IMMUTABLE;

		CREATE OR REPLACE FUNCTION pick_rev_phrasing(phrasing JSONB) RETURNS TEXT AS $$
			SELECT pick_phrasing((phrasing #> '{text_base}')::text, (phrasing #> '{text_question}')::text);
		$$ LANGUAGE SQL IMMUTABLE;

		CREATE OR REPLACE FUNCTION rev_phrasing_to_tsv(phrasing JSONB) RETURNS tsvector AS $$
			SELECT to_tsvector('public.english_nostop'::regconfig, pick_rev_phrasing(phrasing));
		$$ LANGUAGE SQL IMMUTABLE;


		CREATE OR REPLACE FUNCTION phrasing_row_to_tsv(p app_public."nodePhrasings") RETURNS tsvector AS $$
			SELECT phrasings_to_tsv(p.text_base, p.text_question)
		$$ LANGUAGE SQL STABLE;


		CREATE OR REPLACE FUNCTION rev_row_phrasing_to_tsv(p app_public."nodeRevisions") RETURNS tsvector AS $$
			SELECT rev_phrasing_to_tsv(p.phrasing)
		$$ LANGUAGE SQL STABLE;

		CREATE OR REPLACE FUNCTION attachment_quotes_table(attachments JSONB) RETURNS TABLE (quote TEXT) AS $$
			SELECT jsonb_array_elements_text(jsonb_path_query_array(attachments,'$[*].quote.content')) AS quote;
		$$ LANGUAGE SQL IMMUTABLE;

		CREATE OR REPLACE FUNCTION attachment_quotes(attachments JSONB) RETURNS TEXT AS $$
			SELECT string_agg(t, '\n\n') FROM attachment_quotes_table(attachments) AS t;
		$$ LANGUAGE SQL IMMUTABLE;


		CREATE OR REPLACE FUNCTION attachments_to_tsv(attachments JSONB) RETURNS tsvector AS $$
			SELECT jsonb_to_tsvector('public.english_nostop'::regconfig, jsonb_path_query_array(attachments,'$[*].quote.content'), '["string"]');
		$$ LANGUAGE SQL IMMUTABLE;

		CREATE OR REPLACE FUNCTION rev_row_quote_to_tsv(r app_public."nodeRevisions") RETURNS tsvector AS $$
			SELECT attachments_to_tsv(r.attachments);
		$$ LANGUAGE SQL STABLE;

		CREATE INDEX node_phrasings_text_en_idx on app_public."nodePhrasings" using gin (phrasing_tsvector);
		CREATE INDEX node_revisions_phrasing_en_idx on app_public."nodeRevisions" using gin(phrasing1_tsvector) WHERE replaced_by IS NULL;
		CREATE INDEX node_revisions_quotes_en_idx ON app_public."nodeRevisions" using gin(attachments_tsvector) WHERE replaced_by IS NULL;
		CREATE INDEX node_revisions_node_idx ON app_public."nodeRevisions" (node);
		CREATE INDEX node_phrasings_node_idx ON app_public."nodePhrasings" (node);

		CREATE OR REPLACE FUNCTION local_search(
			root text, query text,
			slimit INTEGER DEFAULT 20, soffset INTEGER DEFAULT 0, depth INTEGER DEFAULT 10,
			quote_rank_factor FLOAT DEFAULT 0.9, alt_phrasing_rank_factor FLOAT default 0.95
		) RETURNS TABLE (node_id TEXT, rank FLOAT, type TEXT, found_text TEXT, node_text TEXT) AS $$
			WITH d AS (SELECT id FROM descendants2(root, depth)),
				q AS (SELECT websearch_to_tsquery('public.english_nostop'::regconfig, query) AS q),
				lrev AS (SELECT DISTINCT ON (node) node, id FROM app_public."nodeRevisions" ORDER BY node, "createdAt" DESC),
				p AS (
					SELECT rev.node AS node_id,
						NULL AS phrasing_id,
						ts_rank(rev.phrasing1_tsvector, q.q) AS rank,
						'standard' AS type
						FROM app_public."nodeRevisions" rev
						JOIN lrev USING (id)
						JOIN d ON rev.node = d.id
						JOIN q ON (true)
						WHERE rev.replaced_by IS NULL AND q @@ rev.phrasing1_tsvector
					UNION (
						SELECT rev.node AS node_id,
							NULL AS phrasing_id,
							ts_rank(rev.attachments_tsvector, q.q) * quote_rank_factor AS rank,
							'quote' AS type
							FROM app_public."nodeRevisions" rev
							JOIN lrev USING (id)
							JOIN d ON rev.node = d.id
							JOIN q ON (true)
							WHERE rev.replaced_by IS NULL AND q @@ rev.attachments_tsvector
					) UNION (
						SELECT phrasing.node AS node_id,
							phrasing.id AS phrasing_id,
							ts_rank(phrasing.phrasing_tsvector, q.q) * alt_phrasing_rank_factor AS rank,
							phrasing.type AS type
							FROM app_public."nodePhrasings" AS phrasing
							JOIN d ON phrasing.node = d.id
							JOIN q ON (true)
							WHERE q @@ phrasing.phrasing_tsvector
					)
				),
				op AS (SELECT DISTINCT ON (node_id) node_id, phrasing_id, rank, type FROM p ORDER BY node_id, rank DESC),
				op2 AS (SELECT * FROM op ORDER BY rank DESC LIMIT slimit OFFSET soffset)
			SELECT op2.node_id, op2.rank, op2.type,
				(CASE
					WHEN op2.type = 'quote' THEN ts_headline('public.english_nostop'::regconfig, attachment_quotes(rev.attachments), q.q)
					WHEN op2.type = 'standard' AND phrasing_id IS NULL THEN ts_headline('public.english_nostop'::regconfig, pick_rev_phrasing(rev.phrasing), q.q)
					ELSE ts_headline('public.english_nostop'::regconfig, pick_phrasing(phrasing.text_base, phrasing.text_question), q.q)
					END
				) AS found_text,
				pick_rev_phrasing(rev.phrasing) AS node_text
				FROM op2
				JOIN lrev ON (op2.node_id = lrev.node)
				JOIN app_public."nodeRevisions" AS rev USING (id)
				JOIN q ON (true)
				LEFT JOIN app_public."nodePhrasings" AS phrasing ON phrasing.id = op2.phrasing_id;
		$$ LANGUAGE SQL STABLE;

    













		

		-- simple RLS policies (where to access, it must be that: user is creator, user is admin, entry's policy allows general access [without user-specific block], or entry's policy has user-specific grant)

		alter table app_public."terms" enable row level security;
		do $$ begin
			drop policy if exists "terms_rls" on app_public."terms";
			create policy "terms_rls" on app_public."terms" as permissive for all using (IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess(creator, "accessPolicy", 'terms'));
		end $$;

		alter table app_public."medias" enable row level security;
		do $$ begin
			drop policy if exists "medias_rls" on app_public."medias";
			create policy "medias_rls" on app_public."medias" as permissive for all using (IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess(creator, "accessPolicy", 'medias'));
		end $$;

		alter table app_public."maps" enable row level security;
		do $$ begin
			drop policy if exists "maps_rls" on app_public."maps";
			create policy "maps_rls" on app_public."maps" as permissive for all using (IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess(creator, "accessPolicy", 'maps'));
		end $$;

		alter table app_public."nodes" enable row level security;
		do $$ begin
			drop policy if exists "nodes_rls" on app_public."nodes";
			create policy "nodes_rls" on app_public."nodes" as permissive for all using (IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess(creator, "accessPolicy", 'nodes'));
		end $$;

		-- derivative RLS policies (where to access an entry, the RLS policies of its associated objects must all pass)

		alter table app_public."mapNodeEdits" enable row level security;
		do $$ begin
			drop policy if exists "mapNodeEdits_rls" on app_public."mapNodeEdits";
			create policy "mapNodeEdits_rls" on app_public."mapNodeEdits" as permissive for all using (
				IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.maps where id = "map"), 'maps')
				and IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.nodes where id = "node"), 'nodes')
			);
		end $$;

		alter table app_public."nodeChildLinks" enable row level security;
		do $$ begin
			drop policy if exists "nodeChildLinks_rls" on app_public."nodeChildLinks";
			create policy "nodeChildLinks_rls" on app_public."nodeChildLinks" as permissive for all using (
				IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.nodes where id = "parent"), 'nodes')
				and IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.nodes where id = "child"), 'nodes')
			);
		end $$;

		alter table app_public."nodePhrasings" enable row level security;
		do $$ begin
			drop policy if exists "nodePhrasings_rls" on app_public."nodePhrasings";
			create policy "nodePhrasings_rls" on app_public."nodePhrasings" as permissive for all using (
				IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.nodes where id = "node"), 'nodes')
			);
		end $$;

		alter table app_public."nodeRatings" enable row level security;
		do $$ begin
			drop policy if exists "nodeRatings_rls" on app_public."nodeRatings";
			create policy "nodeRatings_rls" on app_public."nodeRatings" as permissive for all using (
				IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess(creator, "accessPolicy", 'nodeRatings')
				and IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.nodes where id = "node"), 'nodes')
			);
		end $$;

		alter table app_public."nodeRevisions" enable row level security;
		do $$ begin
			drop policy if exists "nodeRevisions_rls" on app_public."nodeRevisions";
			create policy "nodeRevisions_rls" on app_public."nodeRevisions" as permissive for all using (
				IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.nodes where id = "node"), 'nodes')
			);
		end $$;

		alter table app_public."nodeTags" enable row level security;
		do $$ begin
			drop policy if exists "nodeTags_rls" on app_public."nodeTags";
			create policy "nodeTags_rls" on app_public."nodeTags" as permissive for all using (
				CanCurrentUserAccessAllNodesInArray("nodes")
			);
		end $$;

		-- unique RLS policies

		alter table app_public."userHiddens" enable row level security;
		do $$ begin
			drop policy if exists "userHiddens_rls" on app_public."userHiddens";
			create policy "userHiddens_rls" on app_public."userHiddens" as permissive for all using (id = current_setting('app.current_user_id'));
		end $$;

		alter table app_public."commandRuns" enable row level security;
		do $$ begin
			drop policy if exists "commandRuns_rls" on app_public."commandRuns";
			create policy "commandRuns_rls" on app_public."commandRuns" as permissive for all using (
				current_setting('app.current_user_admin') = 'true'
				or (
					-- public_base = true, iff the Command class has "canShowInStream" enabled, and the user has "addToStream" enabled (see CommandMacros/General.ts)
					public_base = true
					and (
						CanCurrentUserAccessAllNodesInArray(array(select jsonb_array_elements_text("rlsTargets" -> 'nodes')))
					)
				)
			);
		end $$;
	`);

	console.log("Done");
}

// migration script
// ==========

export async function up(knex: Knex.Transaction) {
	const info = await Start(knex);
	const {v} = info;

	// used by generated code
	function RunFieldInit(tableBuilder: Knex.TableBuilder, fieldName: string, fieldInitFunc: (t: Knex.TableBuilder, n: string)=>Knex.ColumnBuilder) {
		const methodsCalled = [] as string[];
		const methodCallInterceptor = new Proxy({}, {
			get(target, methodName: string) {
				methodsCalled.push(methodName);
				return ()=>methodCallInterceptor;
			},
		});
		// do one early call, with the "builder"/"chain" object being the method-call-interceptor; this way, we know what methods are called, ie. the field characteristics
		fieldInitFunc(methodCallInterceptor as any, fieldName);
		//const fieldMarkedNullable = fieldInitFunc.toString().includes(".nullable()");
		const fieldMarkedNullable = methodsCalled.includes("nullable");

		const chain = fieldInitFunc(tableBuilder, fieldName);
		// if field is not explicitly marked nullable, assume it is intended to be non-nullable (the safer default; and makes the default match that of TypeScript and the @Field decorator)
		if (!fieldMarkedNullable) {
			chain.notNullable();
		}
	}

	// PLACEHOLDER_FOR_DYNAMIC_CODE

	await End(knex, info);
}
/*export function down() {
	throw new Error("Not implemented.");
}*/