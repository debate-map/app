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

-- access-policy targets: AccessPolicyTriggers.sql, reading and writing through `data` (BEFORE triggers can't read generated columns)
-- ==========

CREATE OR REPLACE FUNCTION app.targets_empty(row_data jsonb) RETURNS boolean LANGUAGE SQL IMMUTABLE AS $$
	SELECT coalesce(jsonb_array_length(CASE WHEN jsonb_typeof(row_data->'c_accessPolicyTargets') = 'array' THEN row_data->'c_accessPolicyTargets' END), 0) = 0;
$$;
CREATE OR REPLACE FUNCTION app.with_targets(row_data jsonb, targets text[]) RETURNS jsonb LANGUAGE SQL IMMUTABLE AS $$
	SELECT jsonb_set(row_data, '{c_accessPolicyTargets}', to_jsonb(coalesce(targets, array[]::text[])));
$$;

-- "pull" triggers, ie. responsive changes to a row's own targets, based on source creation/changes in that same row

CREATE OR REPLACE FUNCTION app.map_node_edits_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR app.targets_empty(NEW.data)
		OR OLD.data->>'map' IS DISTINCT FROM NEW.data->>'map'
		OR OLD.data->>'node' IS DISTINCT FROM NEW.data->>'node'
	) THEN
		NEW.data = app.with_targets(NEW.data, distinct_array(array[
			(SELECT concat((SELECT "accessPolicy" FROM "maps" WHERE id = NEW.data->>'map'), ':maps')),
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW.data->>'node'), ':nodes'))
		]));
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS map_node_edits_refresh_targets_for_self on app."mapNodeEdits";
CREATE TRIGGER map_node_edits_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app."mapNodeEdits" FOR EACH ROW EXECUTE FUNCTION app.map_node_edits_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app.node_links_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR app.targets_empty(NEW.data)
		OR OLD.data->>'parent' IS DISTINCT FROM NEW.data->>'parent'
		OR OLD.data->>'child' IS DISTINCT FROM NEW.data->>'child'
	) THEN
		NEW.data = app.with_targets(NEW.data, distinct_array(array[
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW.data->>'parent'), ':nodes')),
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW.data->>'child'), ':nodes'))
		]));
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS node_links_refresh_targets_for_self on app."nodeLinks";
CREATE TRIGGER node_links_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app."nodeLinks" FOR EACH ROW EXECUTE FUNCTION app.node_links_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app.node_phrasings_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR app.targets_empty(NEW.data)
		OR OLD.data->>'node' IS DISTINCT FROM NEW.data->>'node'
	) THEN
		NEW.data = app.with_targets(NEW.data, distinct_array(array[
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW.data->>'node'), ':nodes'))
		]));
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS node_phrasings_refresh_targets_for_self on app."nodePhrasings";
CREATE TRIGGER node_phrasings_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app."nodePhrasings" FOR EACH ROW EXECUTE FUNCTION app.node_phrasings_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app.node_ratings_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR app.targets_empty(NEW.data)
		OR OLD.data->>'accessPolicy' IS DISTINCT FROM NEW.data->>'accessPolicy'
		OR OLD.data->>'node' IS DISTINCT FROM NEW.data->>'node'
	) THEN
		NEW.data = app.with_targets(NEW.data, distinct_array(array[
			(SELECT concat(NEW.data->>'accessPolicy', ':nodeRatings')),
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW.data->>'node'), ':nodes'))
		]));
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS node_ratings_refresh_targets_for_self on app."nodeRatings";
CREATE TRIGGER node_ratings_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app."nodeRatings" FOR EACH ROW EXECUTE FUNCTION app.node_ratings_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app.node_revisions_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR app.targets_empty(NEW.data)
		OR OLD.data->>'node' IS DISTINCT FROM NEW.data->>'node'
	) THEN
		NEW.data = app.with_targets(NEW.data, distinct_array(array[
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW.data->>'node'), ':nodes'))
		]));
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS node_revisions_refresh_targets_for_self on app."nodeRevisions";
CREATE TRIGGER node_revisions_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app."nodeRevisions" FOR EACH ROW EXECUTE FUNCTION app.node_revisions_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app.node_tags_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR app.targets_empty(NEW.data)
		OR OLD.data->'nodes' IS DISTINCT FROM NEW.data->'nodes'
	) THEN
		-- the delete_node command currently does not update/delete associated node-tags, so we have to filter out "empty targets", due to refs to nodes that no longer exist
		NEW.data = app.with_targets(NEW.data, array_remove(distinct_array(
			(SELECT array_agg(
				(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = node_id), ':nodes'))
			) FROM jsonb_array_elements_text(NEW.data->'nodes') AS node_id)
		), ':nodes'));
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS node_tags_refresh_targets_for_self on app."nodeTags";
CREATE TRIGGER node_tags_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app."nodeTags" FOR EACH ROW EXECUTE FUNCTION app.node_tags_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app.command_runs_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR app.targets_empty(NEW.data)
		OR OLD.data->'c_involvedNodes' IS DISTINCT FROM NEW.data->'c_involvedNodes'
	) THEN
		NEW.data = app.with_targets(NEW.data, distinct_array(
			(SELECT array_agg(
				(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = node_id), ':nodes'))
			) FROM jsonb_array_elements_text(NEW.data->'c_involvedNodes') AS node_id)
		));
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS command_runs_refresh_targets_for_self on app."commandRuns";
CREATE TRIGGER command_runs_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app."commandRuns" FOR EACH ROW EXECUTE FUNCTION app.command_runs_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app.timeline_steps_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR app.targets_empty(NEW.data)
		OR OLD.data->>'timelineID' IS DISTINCT FROM NEW.data->>'timelineID'
	) THEN
		NEW.data = app.with_targets(NEW.data, distinct_array(array[
			(SELECT concat((SELECT "accessPolicy" FROM "timelines" WHERE id = NEW.data->>'timelineID'), ':others'))
		]));
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS timeline_steps_refresh_targets_for_self on app."timelineSteps";
CREATE TRIGGER timeline_steps_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app."timelineSteps" FOR EACH ROW EXECUTE FUNCTION app.timeline_steps_refresh_targets_for_self();

-- "push" triggers, ie. responsive changes to other tables' targets, based on source changes in our row (ie. to our "accessPolicy" field)

CREATE OR REPLACE FUNCTION app.maps_refresh_targets_for_others() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'DELETE' -- also trigger on deletes, as this helps catch errors
		OR OLD.data->>'accessPolicy' IS DISTINCT FROM NEW.data->>'accessPolicy'
	) THEN
		-- simply cause the associated rows in the other tables to have their triggers run again (emptying the targets makes their pull triggers recompute them)
		UPDATE app."mapNodeEdits" SET data = app.with_targets(data, array[]::text[]) WHERE "map" = OLD.id;
	END IF;
	RETURN NULL; -- result-value is ignored (since in an AFTER trigger), but must still return something
END $$;
DROP TRIGGER IF EXISTS maps_refresh_targets_for_others on app."maps";
CREATE TRIGGER maps_refresh_targets_for_others AFTER UPDATE OR DELETE ON app."maps" FOR EACH ROW EXECUTE FUNCTION app.maps_refresh_targets_for_others();

CREATE OR REPLACE FUNCTION app.nodes_refresh_targets_for_others() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'DELETE' -- also trigger on deletes, as this helps catch errors (also needed atm for about-to-be-orphaned node-tags)
		OR OLD.data->>'accessPolicy' IS DISTINCT FROM NEW.data->>'accessPolicy'
	) THEN
		-- simply cause the associated rows in the other tables to have their triggers run again (emptying the targets makes their pull triggers recompute them)
		UPDATE app."mapNodeEdits" SET data = app.with_targets(data, array[]::text[]) WHERE "node" = OLD.id;
		UPDATE app."nodeLinks" SET data = app.with_targets(data, array[]::text[]) WHERE "parent" = OLD.id OR "child" = OLD.id;
		UPDATE app."nodePhrasings" SET data = app.with_targets(data, array[]::text[]) WHERE "node" = OLD.id;
		UPDATE app."nodeRatings" SET data = app.with_targets(data, array[]::text[]) WHERE "node" = OLD.id;
		UPDATE app."nodeRevisions" SET data = app.with_targets(data, array[]::text[]) WHERE "node" = OLD.id;
		UPDATE app."nodeTags" SET data = app.with_targets(data, array[]::text[]) WHERE OLD.id = ANY("nodes");
		UPDATE app."commandRuns" SET data = app.with_targets(data, array[]::text[]) WHERE OLD.id = ANY("c_involvedNodes");
	END IF;
	RETURN NULL; -- result-value is ignored (since in an AFTER trigger), but must still return something
END $$;
DROP TRIGGER IF EXISTS nodes_refresh_targets_for_others on app."nodes";
CREATE TRIGGER nodes_refresh_targets_for_others AFTER UPDATE OR DELETE ON app."nodes" FOR EACH ROW EXECUTE FUNCTION app.nodes_refresh_targets_for_others();

CREATE OR REPLACE FUNCTION app.timelines_refresh_targets_for_others() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'DELETE' -- also trigger on deletes, as this helps catch errors
		OR OLD.data->>'accessPolicy' IS DISTINCT FROM NEW.data->>'accessPolicy'
	) THEN
		-- simply cause the associated rows in the other tables to have their triggers run again (emptying the targets makes their pull triggers recompute them)
		UPDATE app."timelineSteps" SET data = app.with_targets(data, array[]::text[]) WHERE "timelineID" = OLD.id;
	END IF;
	RETURN NULL; -- result-value is ignored (since in an AFTER trigger), but must still return something
END $$;
DROP TRIGGER IF EXISTS timelines_refresh_targets_for_others on app."timelines";
CREATE TRIGGER timelines_refresh_targets_for_others AFTER UPDATE OR DELETE ON app."timelines" FOR EACH ROW EXECUTE FUNCTION app.timelines_refresh_targets_for_others();

-- this function is not called during regular operation, but it's useful for manual maintenance (eg. it's needed just after the restore of a pgdump backup)
CREATE OR REPLACE FUNCTION app.recalculate_all_access_policy_targets() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
	-- all tables that have a "c_accessPolicyTargets" field
	tables text[] := array[
		'mapNodeEdits',
		'nodeLinks',
		'nodePhrasings',
		'nodeRatings',
		'nodeRevisions',
		'nodeTags',
		'commandRuns',
		'timelineSteps'
	];
BEGIN
	-- loop through all tables, and empty their targets, so the pull triggers recompute them
	FOR i IN 1..array_length(tables, 1) LOOP
		EXECUTE format('UPDATE app.%I SET data = app.with_targets(data, array[]::text[])', tables[i]);
	END LOOP;
END $$;
