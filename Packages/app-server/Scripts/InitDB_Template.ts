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
							and "permissions_userExtends" -> current_setting('app.current_user_id') -> policyField -> 'access' != 'false'
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