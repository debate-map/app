# Migration notes

* This document catalogs changes to the database structure and/or graphql api.
* The "DB response" instructions only need to be followed for those with their own server instance.
* The "GraphQL response" instructions only need to be followed for those with a custom client or data-access scripts.
	* When exploring the new graphql api/data-structures, one can augment the written instructions with exploration of the new api, using the `app-server.debatemap.app/gql-playground` endpoint. (temporarily located at `app-server.debates.app/gql-playground`)

## Main series	

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
		* 2\) To be comprehensive, you could update the names of the linked constraints and indexes (see `nodeLinks.sql`). (I wouldn't bother though, as their names themselves are unlikely to need referencing)
	* GraphQL response:
		* 1\) Update queries: `nodeChildLinks` -> `nodeLinks`, `addNodeChildLink` -> `addNodeLink`, etc.
* 2\) Removed table (not in use): `visibilityDirectives`
	* DB response:
		* 1\) Directly remove the table using DBeaver.

### Pushed on 2022-11-22

* 1\) Renamed field (to make consistent with the rest): `nodeRevisions.replaced_by` -> `nodeRevisions.replacedBy`
	* DB response:
		* 1\) Directly update the column-name using DBeaver.
		* 2\) Update the `app_public.after_insert_node_revision()` function using DBeaver. (see `nodeRevisions.sql` for new version)
	* GraphQL response:
		* 1\) Update queries `nodeRevisions`, etc. to select the field `replaceBy` rather than `replaced_by`.