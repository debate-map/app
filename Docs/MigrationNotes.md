# Migration notes

* This document catalogs changes to the database structure and/or graphql api.
* The "DB response" instructions only need to be followed for those with their own server instance.
* The "GraphQL response" instructions only need to be followed for those with a custom client or data-access scripts.
	* When exploring the new graphql api/data-structures, one can augment the written instructions with exploration of the new api, using the `app-server.debatemap.app/gql-playground` endpoint. (temporarily located at `app-server.debates.app/gql-playground`)

## Main series

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
* 3\) Added a `searchGlobally` graphql endpoint.
	* DB response:
		* 1\) Apply the sql in `Search.sql`.

### Pushed on 2023-01-04

* 1\) Added the field `c_accessPolicyTargets` (and added non-null and non-empty constraints for it) to tables: `commandRuns, mapNodeEdits, nodeLinks, nodePhrasings, nodeRatings, nodeRevisions, nodeTags`
	* DB response:
		* 1\) Execute sql: (if this block takes forever to execute, first disable the RLS policies of the tables-to-modify, and retry)
			```sql
			-- start with the columns able to be null (so other steps can be completed)
			BEGIN;
				ALTER TABLE app_public."commandRuns" ADD COLUMN "c_accessPolicyTargets" text[];
				ALTER TABLE app_public."mapNodeEdits" ADD COLUMN "c_accessPolicyTargets" text[];
				ALTER TABLE app_public."nodeLinks" ADD COLUMN "c_accessPolicyTargets" text[];
				ALTER TABLE app_public."nodePhrasings" ADD COLUMN "c_accessPolicyTargets" text[];
				ALTER TABLE app_public."nodeRatings" ADD COLUMN "c_accessPolicyTargets" text[];
				ALTER TABLE app_public."nodeRevisions" ADD COLUMN "c_accessPolicyTargets" text[];
				ALTER TABLE app_public."nodeTags" ADD COLUMN "c_accessPolicyTargets" text[];
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

				ALTER TABLE app_public."commandRuns" ALTER COLUMN "c_accessPolicyTargets" SET NOT NULL, DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);
				ALTER TABLE app_public."mapNodeEdits" ALTER COLUMN "c_accessPolicyTargets" SET NOT NULL, DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);
				ALTER TABLE app_public."nodeLinks" ALTER COLUMN "c_accessPolicyTargets" SET NOT NULL, DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);
				ALTER TABLE app_public."nodePhrasings" ALTER COLUMN "c_accessPolicyTargets" SET NOT NULL, DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);
				ALTER TABLE app_public."nodeRatings" ALTER COLUMN "c_accessPolicyTargets" SET NOT NULL, DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);
				ALTER TABLE app_public."nodeRevisions" ALTER COLUMN "c_accessPolicyTargets" SET NOT NULL, DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);
				--ALTER TABLE app_public."nodeTags" ALTER COLUMN "c_accessPolicyTargets" SET NOT NULL, DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);
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
		* 2\) Update the `app_public.after_insert_node_revision()` function using DBeaver. (see `nodeRevisions.sql` for new version)
	* GraphQL response:
		* 1\) Update queries `nodeRevisions`, etc. to select the field `replaceBy` rather than `replaced_by`.