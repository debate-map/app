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

-- indexes: as Tables/*.sql, plus IF NOT EXISTS; the tsvector ones index the views' functions (no stored columns)
-- ==========

CREATE INDEX IF NOT EXISTS nodelinks_parent_child ON app."nodeLinks" USING btree (parent, child);
CREATE INDEX IF NOT EXISTS node_link_access_idx ON app."nodeLinks" USING gin ("c_accessPolicyTargets");

CREATE INDEX IF NOT EXISTS node_phrasings_access_idx ON app."nodePhrasings" USING gin ("c_accessPolicyTargets");
CREATE INDEX IF NOT EXISTS node_phrasings_node_idx ON app."nodePhrasings" USING btree (node);
CREATE INDEX IF NOT EXISTS node_phrasings_text_en_idx ON app."nodePhrasings" USING gin (app.phrasings_to_tsv(text_base, text_question));

CREATE INDEX IF NOT EXISTS node_revisions_node_idx ON app."nodeRevisions" USING btree (node);
CREATE INDEX IF NOT EXISTS node_revisions_access_idx ON app."nodeRevisions" USING gin ("c_accessPolicyTargets");
CREATE INDEX IF NOT EXISTS node_revisions_phrasing_en_idx ON app."nodeRevisions" USING gin (app.rev_phrasing_to_tsv(phrasing)) WHERE ("replacedBy" IS NULL);
CREATE INDEX IF NOT EXISTS node_revisions_quotes_en_idx ON app."nodeRevisions" USING gin (app.attachments_to_tsv(attachments)) WHERE ("replacedBy" IS NULL);
CREATE INDEX IF NOT EXISTS attachments_gin ON app."nodeRevisions" USING gin ("attachments");

CREATE INDEX IF NOT EXISTS node_access_idx ON app.nodes ("accessPolicy");

CREATE INDEX IF NOT EXISTS node_tags_nodes_idx ON app."nodeTags" USING gin (nodes);
