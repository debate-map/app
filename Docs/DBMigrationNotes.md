# DB migration notes

## Main series

### Pushed on 2022-12-21

* 1\) Updated all `nodeLinks.orderKey` cells, replacing any substrings of `0|` or `:` with an empty string. (changes done to make the old lexorank order-keys compatible with the new `lexicon_fractional_index` crate)
	* Response:
		* 1\) Run the following SQL command: `UPDATE "nodeLinks" SET "orderKey" = replace(replace("orderKey", '0|', ''), ':', '')`

### Pushed on 2022-12-19

* 1\) Renamed table: `nodeChildLinks` -> `nodeLinks`
	* Response:
		* 1\) Directly update the table-name using DBeaver.
		* 2\) To be comprehensive, you could update the names of the linked constraints and indexes (see `nodeLinks.sql`). (I wouldn't bother though, as their names themselves are unlikely to need referencing)
* 2\) Removed table (not in use): `visibilityDirectives`
	* Response:
		* 1\) Directly remove the table using DBeaver.

### Pushed on 2022-11-22

* 1\) Renamed field (to make consistent with the rest): `nodeRevisions.replaced_by` -> `nodeRevisions.replacedBy`
	* Response:
		* 1\) Directly update the column-name using DBeaver.
		* 2\) Update the `app_public.after_insert_node_revision()` function using DBeaver. (see `nodeRevisions.sql` for new version)