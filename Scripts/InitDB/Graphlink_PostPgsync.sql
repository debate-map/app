-- InitDB pieces rewritten for graphlink's layout (`id` + `data`, every other column generated from it); runs after pgsync on every boot

-- views pin their columns: drop them before anything below alters one (recreated in the views section)
DROP VIEW IF EXISTS app.my_nodes, app.my_node_revisions, app.my_node_phrasings, app.my_node_links;

-- collations: nodeLinks.id and orderKey sort bytewise (COLLATE "C"), as in nodeLinks.sql
-- ==========

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'app' AND table_name = 'nodeLinks' AND column_name IN ('id', 'orderKey') AND collation_name IS DISTINCT FROM 'C') THEN
		ALTER TABLE app."nodeLinks" ALTER COLUMN id TYPE text COLLATE "C", ALTER COLUMN "orderKey" TYPE text COLLATE "C";
	END IF;
END $$;

-- views: as RLSViews.sql, but on access_policies and with the search tsvectors computed here
-- ==========

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

-- constraints: the c_accessPolicyTargets checks and subscriptions' unique key from Tables/*.sql, added only when missing
-- ==========

DO $$ DECLARE t text; BEGIN
	FOREACH t IN ARRAY ARRAY['commandRuns', 'mapNodeEdits', 'nodeLinks', 'nodePhrasings', 'nodeRatings', 'nodeRevisions'] LOOP -- not nodeTags: nodeTags.sql leaves it out on purpose
		IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'c_accessPolicyTargets_check' AND conrelid = format('app.%I', t)::regclass) THEN
			EXECUTE format('ALTER TABLE app.%I ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0)', t);
		END IF;
	END LOOP;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_uk_user_node' AND conrelid = 'app.subscriptions'::regclass) THEN
		ALTER TABLE app.subscriptions ADD CONSTRAINT subscriptions_uk_user_node UNIQUE ("user", "node");
	END IF;
END $$;

-- foreign keys: as FKConstraints.sql (same names), added only when missing
-- ==========

DO $$ DECLARE fk record; BEGIN
	FOR fk IN SELECT * FROM (VALUES
		('maps', 'fk @from(accessPolicy) @to(accessPolicies.id)', 'FOREIGN KEY ("accessPolicy") REFERENCES app.access_policies(id) DEFERRABLE'),
		('medias', 'fk @from(accessPolicy) @to(accessPolicies.id)', 'FOREIGN KEY ("accessPolicy") REFERENCES app.access_policies(id) DEFERRABLE'),
		('nodeRatings', 'fk @from(accessPolicy) @to(accessPolicies.id)', 'FOREIGN KEY ("accessPolicy") REFERENCES app.access_policies(id) DEFERRABLE'),
		('nodes', 'fk @from(accessPolicy) @to(accessPolicies.id)', 'FOREIGN KEY ("accessPolicy") REFERENCES app.access_policies(id) DEFERRABLE'),
		('terms', 'fk @from(accessPolicy) @to(accessPolicies.id)', 'FOREIGN KEY ("accessPolicy") REFERENCES app.access_policies(id) DEFERRABLE'),
		('commandRuns', 'fk @from(actor) @to(users.id)', 'FOREIGN KEY (actor) REFERENCES app.users(id) DEFERRABLE'),
		('nodes', 'fk @from(c_currentRevision) @to(nodeRevisions.id)', 'FOREIGN KEY ("c_currentRevision") REFERENCES app."nodeRevisions"(id) DEFERRABLE'),
		('nodeLinks', 'fk @from(child) @to(nodes.id)', 'FOREIGN KEY (child) REFERENCES app.nodes(id) DEFERRABLE'),
		('access_policies', 'fk @from(creator) @to(users.id)', 'FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE'),
		('maps', 'fk @from(creator) @to(users.id)', 'FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE'),
		('medias', 'fk @from(creator) @to(users.id)', 'FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE'),
		('nodeLinks', 'fk @from(creator) @to(users.id)', 'FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE'),
		('nodePhrasings', 'fk @from(creator) @to(users.id)', 'FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE'),
		('nodeRatings', 'fk @from(creator) @to(users.id)', 'FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE'),
		('nodes', 'fk @from(creator) @to(users.id)', 'FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE'),
		('nodeRevisions', 'fk @from(creator) @to(users.id)', 'FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE'),
		('nodeTags', 'fk @from(creator) @to(users.id)', 'FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE'),
		('shares', 'fk @from(creator) @to(users.id)', 'FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE'),
		('terms', 'fk @from(creator) @to(users.id)', 'FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE'),
		('feedback_proposals', 'fk @from(creator) @to(users.id)', 'FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE'),
		('user_hiddens', 'fk @from(lastAccessPolicy) @to(accessPolicies.id)', 'FOREIGN KEY ("lastAccessPolicy") REFERENCES app.access_policies(id) DEFERRABLE'),
		('mapNodeEdits', 'fk @from(map) @to(maps.id)', 'FOREIGN KEY (map) REFERENCES app.maps(id) DEFERRABLE'),
		('mapNodeEdits', 'fk @from(node) @to(nodes.id)', 'FOREIGN KEY (node) REFERENCES app.nodes(id) DEFERRABLE'),
		('nodePhrasings', 'fk @from(node) @to(nodes.id)', 'FOREIGN KEY (node) REFERENCES app.nodes(id) DEFERRABLE'),
		('nodeRatings', 'fk @from(node) @to(nodes.id)', 'FOREIGN KEY (node) REFERENCES app.nodes(id) DEFERRABLE'),
		('nodeRevisions', 'fk @from(node) @to(nodes.id)', 'FOREIGN KEY (node) REFERENCES app.nodes(id) DEFERRABLE'),
		('maps', 'fk @from(nodeAccessPolicy) @to(accessPolicies.id)', 'FOREIGN KEY ("nodeAccessPolicy") REFERENCES app.access_policies(id) DEFERRABLE'),
		('nodeLinks', 'fk @from(parent) @to(nodes.id)', 'FOREIGN KEY (parent) REFERENCES app.nodes(id) DEFERRABLE'),
		('maps', 'fk @from(rootNode) @to(nodes.id)', 'FOREIGN KEY ("rootNode") REFERENCES app.nodes(id) DEFERRABLE INITIALLY DEFERRED'),
		('nodes', 'fk @from(rootNodeForMap) @to(maps.id)', 'FOREIGN KEY ("rootNodeForMap") REFERENCES app.maps(id) DEFERRABLE')
	) AS v(tbl, name, def) LOOP
		IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk.name AND conrelid = format('app.%I', fk.tbl)::regclass) THEN
			EXECUTE format('ALTER TABLE app.%I ADD CONSTRAINT %I %s', fk.tbl, fk.name, fk.def);
		END IF;
	END LOOP;
END $$;
