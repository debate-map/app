# DB migration notes

## Main series

### Pushed on 2022-11-22

* Actions:
	* 1\) Renamed field (to make consistent with the rest): `nodeRevisions.replaced_by` -> `nodeRevisions.replacedBy`
* Response:
	* 1\) Directly update the column-name using DBeaver.
	* 2\) Update the app_public.after_insert_node_revision() function using DBeaver. (see `nodeRevisions.sql` for new version)