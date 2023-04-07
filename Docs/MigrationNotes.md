# Migration notes

* This document catalogs changes to the database structure and/or graphql api.
* The "DB response" instructions only need to be followed for those with their own server instance.
* The "GraphQL response" instructions only need to be followed for those with a custom client or data-access scripts.
	* When exploring the new graphql api/data-structures, one can augment the written instructions with exploration of the new api, using the `app-server.debatemap.app/gql-playground` endpoint. (or, currently, at `app-server.debates.app/gql-playground`)

## Main series

### Pushed on 2023-04-04

* 1\) Added a new node attachment-type, at: `nodeRevisions.attachments.X.description`
* 2\) Changed attachments to only show up in the node sub-panel if they have a (new) `expandedByDefault` field set to true.
	* DB response:
		* 1\) If you want existing nodes with quote or media attachments to have them expanded by default, execute sql:
			```sql
			UPDATE "nodeRevisions" SET attachments = jsonb_set(attachments, '{0,expandedByDefault}', 'true')
			WHERE (attachments -> 0 -> 'quote' != 'null' OR attachments -> 0 -> 'media' != 'null')
				AND (phrasing -> 'text_base' = 'null' OR phrasing -> 'text_base' = '""')
				AND (phrasing -> 'text_negation' = 'null' OR phrasing -> 'text_negation' = '""')
				AND (phrasing -> 'text_question' = 'null' OR phrasing -> 'question' = '""');
			```

### Pushed on 2023-04-03

* 1\) Removed the `nodeRevisions.note` column from the database. (kept that field in the graphql api though, as a proxy of `nodeRevisions.phrasing.note`)
	* DB response:
		* 1\) Execute sql: `UPDATE "nodeRevisions" SET phrasing = jsonb_set(phrasing, '{note}', to_jsonb(note)) WHERE note IS NOT NULL;`
		* 2\) [added later] The command above should have excluded notes that are empty-strings... To fix this mistake from earlier, execute the follow sql: (repeated with the `0` texts changed to `1`, `2`, `3`, etc. up to whatever the max number of attachments are present on node-revisions in the database -- if you think there could be multiple empty-description attachments in the same node-revision, do sequence in descending order, so nothing is missed [shouldn't be necessary in this case])
			```sql
			UPDATE "nodeRevisions"
			SET attachments = attachments #- '{0}'
			WHERE attachments -> 0 -> 'description' != 'null'
				AND attachments -> 0 -> 'description' -> 'text' = ANY(array['""'::jsonb, 'null']);
			```

### Pushed on 2023-01-13 [+01-15]

* 1\) Changed RLS policies slightly. [+fixed that "push" triggers weren't executing on row-deletion]
	* DB response:
		* 1\) Re-apply the sql in `RLSHelpers.sql` and `RLSPolicies.sql`.
* 2\) Disabled the `c_accessPolicyTargets_check` constraint for `nodeTags` table. (since it is valid for node-tag entry to have no rls-targets; not ideal, since leaves it orphaned [will add UI for that for admins later], but better than erroring)
	* DB response:
		* 1\) Execute sql: `ALTER TABLE app."nodeTags" DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check"`

### Pushed on 2023-01-09

* 1\) Changed schema name from `app_public` to just `app`, and removed the unused `public` schema.
	* DB response:
		* 1\) Execute sql:
			```sql
			ALTER SCHEMA app_public RENAME TO app;
			ALTER DATABASE "debate-map" SET search_path TO app; -- for future pg-sessions
			SELECT pg_catalog.set_config('search_path', 'app', false); -- for current pg-session
			```
		* 2\) Execute the sql to drop the `public` schema, if desired. (not really necessary, it's just for cleanup; if choosing to do so, make sure you don't have other data there)
		* 3\) Re-apply the sql in `@PreTables.sql`. `GraphTraversal.sql`, `RLSHelpers.sql`, `Search.sql`, and `AccessPolicyTriggers.sql`.
		* 4\) Re-apply the `after_insert_node_revision` func+trigger in `nodeRevisions.sql`.
		* 5\) Re-apply the "search/text-match config" section in `General_Start.sql`. (may need to drop old objects with those names, if present)
* 2\) Deleted the `app_user` role. (nowadays `admin` is used for rls-bypassing, and `rls_obeyer` is used for rls-respecting)
	* DB response:
		* 1\) Drop all permissions, and the db-connect ability, then drop the role.
* 3\) Changed structure of `commandRuns` table, and added triggers for it.
	* DB response:
		* 1\) Drop the `commandRuns` table (its data is temporary/droppable), and recreate it, by executing the sql in `commandRuns.sql`.
		* 2\) Re-apply the sql in `AccessPolicyTriggers.sql` and `General_End.sql`.
		* 3\) Re-apply the foreign-key constraint for `commandRuns` table, as seen in `FKConstraints.sql`.
		* 4\) Re-apply the rls-policy for `commandRuns` table, as seen in `RLSPolicies.sql`.

### Pushed on 2023-01-06

* 1\) Changed the access-policy-triggers to omit duplicate access-policy-ids in its generated arrays and to exclude "empty targets" (eg. due to node-tags with refs to nodes that no longer exist); also, updated the `do_policies_allow_access` postgres function to reflect the fact that `nodeTags` can be "left without any policy-targets".
	* DB response:
		* 1\) Added helper function, by executing sql:
			```sql
			create or replace function distinct_array(a text[]) returns text[] as $$
				select array (
					select distinct v from unnest(a) as b(v)
				)
			$$ language sql;
			```
		* 2\) Re-apply the sql in `AccessPolicyTriggers.sql` and `RLSHelpers.sql`.
		* 3\) Preferably, regenerate all the `c_accessPolicyTargets` cells by running `UPDATE ___XXX___ SET "c_accessPolicyTargets" = array[]::text[];` for the relevant tables. (see block in 2023-01-04 set)
* 2\) Fixed that some `nodeLinks.orderKey` cells still had characters (from old lexorank system) that are invalid for the new fractional-indexing lib.
	* DB response:
		* 1\) Run the following SQL command: `UPDATE "nodeLinks" SET "orderKey" = replace(replace("orderKey", '^', 'Zza'), '_', 'Zzb')`
* 3\) Added a `searchGlobally` graphql endpoint, and updated the subtree-search postgres-func to a cleaner version (faster from that, but also from an extra change just added to have it use the cached-tsvector fields).
	* DB response:
		* 1\) Apply the sql in `Search.sql`.
* 3\) Merged `nodeRevisions.phrasing1_tsvector` field into the `phrasing_tsvector` field.
	* DB response:
		* 1\) Execute sql:
			```sql
			DROP INDEX app."nodeRevisions_phrasing_tsvector_idx";
			ALTER TABLE app."nodeRevisions" DROP COLUMN phrasing_tsvector;
			ALTER TABLE app."nodeRevisions" RENAME COLUMN phrasing1_tsvector TO phrasing_tsvector;
			DROP INDEX IF EXISTS node_revisions_phrasing_en_idx;
			CREATE INDEX node_revisions_phrasing_tsvector_idx ON app."nodeRevisions" USING gin (phrasing_tsvector) WHERE ("replacedBy" IS NULL);
			```

### Pushed on 2023-01-04

* 1\) Added the field `c_accessPolicyTargets` (and added non-null and non-empty constraints for it) to tables: `commandRuns, mapNodeEdits, nodeLinks, nodePhrasings, nodeRatings, nodeRevisions, nodeTags`
	* DB response:
		* 1\) Execute sql: (if this block takes forever to execute, first disable the RLS policies of the tables-to-modify, and retry)
			```sql
			-- start with the columns able to be null (so other steps can be completed)
			BEGIN;
				ALTER TABLE app."commandRuns" ADD COLUMN "c_accessPolicyTargets" text[];
				ALTER TABLE app."mapNodeEdits" ADD COLUMN "c_accessPolicyTargets" text[];
				ALTER TABLE app."nodeLinks" ADD COLUMN "c_accessPolicyTargets" text[];
				ALTER TABLE app."nodePhrasings" ADD COLUMN "c_accessPolicyTargets" text[];
				ALTER TABLE app."nodeRatings" ADD COLUMN "c_accessPolicyTargets" text[];
				ALTER TABLE app."nodeRevisions" ADD COLUMN "c_accessPolicyTargets" text[];
				ALTER TABLE app."nodeTags" ADD COLUMN "c_accessPolicyTargets" text[];
			COMMIT;
			```
		* 2\) You'll also need to trigger all the existing rows to have their `c_accessPolicyTargets` fields updated (and field constraints set); so **after doing the db-response for root bullet-points 2 and 3 below**, follow-up by executing this sql:
			```sql
			BEGIN;
				UPDATE "commandRuns" SET "c_accessPolicyTargets" = array[]::text[];
				UPDATE "mapNodeEdits" SET "c_accessPolicyTargets" = array[]::text[];
				UPDATE "nodeLinks" SET "c_accessPolicyTargets" = array[]::text[];
				UPDATE "nodePhrasings" SET "c_accessPolicyTargets" = array[]::text[];
				UPDATE "nodeRatings" SET "c_accessPolicyTargets" = array[]::text[];
				UPDATE "nodeRevisions" SET "c_accessPolicyTargets" = array[]::text[];
				UPDATE "nodeTags" SET "c_accessPolicyTargets" = array[]::text[];

				ALTER TABLE app."commandRuns" ALTER COLUMN "c_accessPolicyTargets" SET NOT NULL, DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);
				ALTER TABLE app."mapNodeEdits" ALTER COLUMN "c_accessPolicyTargets" SET NOT NULL, DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);
				ALTER TABLE app."nodeLinks" ALTER COLUMN "c_accessPolicyTargets" SET NOT NULL, DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);
				ALTER TABLE app."nodePhrasings" ALTER COLUMN "c_accessPolicyTargets" SET NOT NULL, DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);
				ALTER TABLE app."nodeRatings" ALTER COLUMN "c_accessPolicyTargets" SET NOT NULL, DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);
				ALTER TABLE app."nodeRevisions" ALTER COLUMN "c_accessPolicyTargets" SET NOT NULL, DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);
				--ALTER TABLE app."nodeTags" ALTER COLUMN "c_accessPolicyTargets" SET NOT NULL, DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);
			COMMIT;
			```
* 2\) Updated the postgres rls-helper functions and many of the rls policies.
	* DB response:
		* 1\) Re-apply the sql in `RLSHelpers.sql`, then in `RLSPolicies.sql`.
* 3\) Added many triggers, for keeping the `c_accessPolicyTargets` fields up-to-date.
	* DB response:
		* 1\) Apply the sql in `AccessPolicyTriggers.sql`.

### Pushed on 2023-01-03

* 1\) Changed the "is user an admin" check in RLS policies to just call into the database, rather than relying on an app-server-supplied `current_user_admin` config-param. (note: this simplifies app-server code, but we'll probably revert to something similar eventually for perf reasons)
	* DB response:
		* 1\) Re-apply all of the sql code in `General_End.sql`, `RLSPolicies.sql`, and `RLSHelpers.sql`.

### Pushed on 2022-12-22

* 1\) Fixed that the node-tag-component structures were being exposed in the graphql api as `JSON` scalars rather than full-fledged GraphQL types.
	* GraphQL response:
		* 1\) Update queries `nodeTags`, etc. to select the subfields of any requested tag-components, rather than just the root field-name of the tag-component itself.

### Pushed on 2022-12-21

* 1\) Updated all `nodeLinks.orderKey` cells, replacing any substrings of `0|` or `:` with an empty string. (changes done to make the old lexorank order-keys compatible with the new `lexicon_fractional_index` crate)
	* DB response:
		* 1\) Run the following SQL command: `UPDATE "nodeLinks" SET "orderKey" = replace(replace("orderKey", '0|', ''), ':', '')`

### Pushed on 2022-12-19

* 1\) Renamed table: `nodeChildLinks` -> `nodeLinks`
	* DB response:
		* 1\) Directly update the table-name using DBeaver.
		* 2\) Update the functions in `GraphTraversal.sql` to match the newer versions.
		* 3\) To be comprehensive, you could update the names of the linked constraints and indexes (see `nodeLinks.sql`). (I wouldn't bother though, as their names themselves are unlikely to need referencing)
	* GraphQL response:
		* 1\) Update queries: `nodeChildLinks` -> `nodeLinks`, `addNodeChildLink` -> `addNodeLink`, etc.
* 2\) Removed table (not in use): `visibilityDirectives`
	* DB response:
		* 1\) Directly remove the table using DBeaver.
* 3\) Fixed that `NodePhrasing.terms` was being exposed in the graphql api as `JSON` scalars rather than full-fledged GraphQL types.
	* GraphQL response:
		* 1\) Update queries `nodePhrasings`, etc. to select the subfields of the entries in `terms` (ie. `terms { id }`), rather than just the `terms` field-name.
* 4\) Fixed that `NodeRevision.phrasing` was being exposed in the graphql api as a `JSON` scalar rather than a full-fledged GraphQL type.
	* GraphQL response:
		* 1\) Update queries `nodeRevisions`, etc. to select the subfields of `NodeRevision.phrasing` (eg. `phrasing { text_base }`), rather than just the `phrasing` field-name.

### Pushed on 2022-11-22

* 1\) Renamed field (to make consistent with the rest): `nodeRevisions.replaced_by` -> `nodeRevisions.replacedBy`
	* DB response:
		* 1\) Directly update the column-name using DBeaver.
		* 2\) Update the `app.after_insert_node_revision()` function using DBeaver. (see `nodeRevisions.sql` for new version)
	* GraphQL response:
		* 1\) Update queries `nodeRevisions`, etc. to select the field `replacedBy` rather than `replaced_by`.