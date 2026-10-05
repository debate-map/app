-- InitDB pieces rewritten for graphlink's layout (`id` + `data`, every other column generated from it); runs after pgsync on every boot

-- views: as RLSViews.sql, but on access_policies and with the search tsvectors computed here
-- ==========

DROP VIEW IF EXISTS app.my_nodes, app.my_node_revisions, app.my_node_phrasings, app.my_node_links;

CREATE VIEW app.my_nodes WITH (security_barrier=off)
	AS WITH q1 AS (
		SELECT array_agg(id) AS pol
		FROM app.access_policies
		WHERE is_user_admin(current_setting('app.current_user_id')) OR coalesce(("permissions_userExtends" -> current_setting('app.current_user_id') -> 'nodes' -> 'access')::boolean,
			("permissions" -> 'nodes' -> 'access')::boolean))
		SELECT app.nodes.* FROM app.nodes JOIN q1 ON "accessPolicy" = ANY(q1.pol);

CREATE VIEW app.my_node_revisions WITH (security_barrier=off)
	AS WITH q1 AS (
		SELECT array_agg(concat(id, ':nodes')) AS pol
		FROM app.access_policies
		WHERE is_user_admin(current_setting('app.current_user_id')) OR coalesce(("permissions_userExtends" -> current_setting('app.current_user_id') -> 'nodes' -> 'access')::boolean,
			("permissions" -> 'nodes' -> 'access')::boolean))
		SELECT app."nodeRevisions".*, app.rev_phrasing_to_tsv(app."nodeRevisions".phrasing) AS phrasing_tsvector, app.attachments_to_tsv(app."nodeRevisions".attachments) AS attachments_tsvector FROM app."nodeRevisions" JOIN q1 ON (
			("c_accessPolicyTargets" && q1.pol));

CREATE VIEW app.my_node_phrasings WITH (security_barrier=off)
	AS WITH q1 AS (
		SELECT array_agg(concat(id, ':nodes')) AS pol
		FROM app.access_policies
		WHERE is_user_admin(current_setting('app.current_user_id')) OR coalesce(("permissions_userExtends" -> current_setting('app.current_user_id') -> 'nodes' -> 'access')::boolean,
			("permissions" -> 'nodes' -> 'access')::boolean))
		SELECT app."nodePhrasings".*, app.phrasings_to_tsv(app."nodePhrasings".text_base, app."nodePhrasings".text_question) AS phrasing_tsvector FROM app."nodePhrasings" JOIN q1 ON ("c_accessPolicyTargets" && q1.pol);

CREATE VIEW app.my_node_links WITH (security_barrier=off)
	AS WITH q1 AS (
		SELECT array_agg(concat(id, ':nodes')) AS pol
		FROM app.access_policies
		WHERE is_user_admin(current_setting('app.current_user_id')) OR coalesce(("permissions_userExtends" -> current_setting('app.current_user_id') -> 'nodes' -> 'access')::boolean,
			("permissions" -> 'nodes' -> 'access')::boolean))
		SELECT app."nodeLinks".* FROM app."nodeLinks" JOIN q1 ON (
			("c_accessPolicyTargets" && q1.pol));
