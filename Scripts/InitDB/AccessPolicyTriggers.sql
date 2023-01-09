-- "pull" triggers, ie. responsive changes to a row's own "c_accessPolicyTargets" field, based on source creation/changes in that same row
-- ==========

CREATE OR REPLACE FUNCTION app.map_node_edits_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		--TG_OP = 'INSERT' OR (OLD."c_accessPolicyTargets" IS DISTINCT FROM NEW."c_accessPolicyTargets" AND cardinality(NEW."c_accessPolicyTargets") = 0)
		TG_OP = 'INSERT' OR cardinality(NEW."c_accessPolicyTargets") = 0
		OR OLD."map" IS DISTINCT FROM NEW."map"
		OR OLD."node" IS DISTINCT FROM NEW."node"
	) THEN
		NEW."c_accessPolicyTargets" = distinct_array(array[
			(SELECT concat((SELECT "accessPolicy" FROM "maps" WHERE id = NEW."map"), ':maps')),
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW."node"), ':nodes'))
		]);
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS map_node_edits_refresh_targets_for_self on app."mapNodeEdits";
CREATE TRIGGER map_node_edits_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app."mapNodeEdits" FOR EACH ROW EXECUTE FUNCTION app.map_node_edits_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app.node_links_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR cardinality(NEW."c_accessPolicyTargets") = 0
		OR OLD."parent" IS DISTINCT FROM NEW."parent"
		OR OLD."child" IS DISTINCT FROM NEW."child"
	) THEN
		NEW."c_accessPolicyTargets" = distinct_array(array[
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW."parent"), ':nodes')),
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW."child"), ':nodes'))
		]);
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS node_links_refresh_targets_for_self on app."nodeLinks";
CREATE TRIGGER node_links_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app."nodeLinks" FOR EACH ROW EXECUTE FUNCTION app.node_links_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app.node_phrasings_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR cardinality(NEW."c_accessPolicyTargets") = 0
		OR OLD."node" IS DISTINCT FROM NEW."node"
	) THEN
		NEW."c_accessPolicyTargets" = distinct_array(array[
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW."node"), ':nodes'))
		]);
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS node_phrasings_refresh_targets_for_self on app."nodePhrasings";
CREATE TRIGGER node_phrasings_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app."nodePhrasings" FOR EACH ROW EXECUTE FUNCTION app.node_phrasings_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app.node_ratings_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR cardinality(NEW."c_accessPolicyTargets") = 0
		OR OLD."accessPolicy" IS DISTINCT FROM NEW."accessPolicy"
		OR OLD."node" IS DISTINCT FROM NEW."node"
	) THEN
		NEW."c_accessPolicyTargets" = distinct_array(array[
			(SELECT concat(NEW."accessPolicy", ':nodeRatings')),
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW."node"), ':nodes'))
		]);
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS node_ratings_refresh_targets_for_self on app."nodeRatings";
CREATE TRIGGER node_ratings_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app."nodeRatings" FOR EACH ROW EXECUTE FUNCTION app.node_ratings_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app.node_revisions_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR cardinality(NEW."c_accessPolicyTargets") = 0
		OR OLD."node" IS DISTINCT FROM NEW."node"
	) THEN
		NEW."c_accessPolicyTargets" = distinct_array(array[
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW."node"), ':nodes'))
		]);
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS node_revisions_refresh_targets_for_self on app."nodeRevisions";
CREATE TRIGGER node_revisions_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app."nodeRevisions" FOR EACH ROW EXECUTE FUNCTION app.node_revisions_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app.node_tags_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR cardinality(NEW."c_accessPolicyTargets") = 0
		OR OLD."nodes" IS DISTINCT FROM NEW."nodes"
	) THEN
		NEW."c_accessPolicyTargets" = distinct_array(
			(SELECT array_agg(
				(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = node_id), ':nodes'))
			) FROM unnest(NEW."nodes") AS node_id)
		);
		-- the delete_node command currently does not update/delete associated node-tags, so we have to filter out "empty targets", due to refs to nodes that no longer exist
		NEW."c_accessPolicyTargets" = array_remove(NEW."c_accessPolicyTargets", ':nodes');
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS node_tags_refresh_targets_for_self on app."nodeTags";
CREATE TRIGGER node_tags_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app."nodeTags" FOR EACH ROW EXECUTE FUNCTION app.node_tags_refresh_targets_for_self();

-- todo: handle commandRuns table (delayed until the command-run insertion system is set up)

-- "push" triggers, ie. responsive changes to other tables' "c_accessPolicyTargets" fields, based on source changes in our row (ie. to our "accessPolicy" field)
-- ==========

CREATE OR REPLACE FUNCTION app.maps_refresh_targets_for_others() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (OLD."accessPolicy" IS DISTINCT FROM NEW."accessPolicy") THEN
		-- simply cause the associated rows in the other tables to have their triggers run again
		UPDATE app."mapNodeEdits" SET "c_accessPolicyTargets" = array[]::text[] WHERE "map" = NEW.id;
	END IF;
	RETURN NULL; -- result-value is ignored (since in an AFTER trigger), but must still return something
END $$;
DROP TRIGGER IF EXISTS maps_refresh_targets_for_others on app."maps";
CREATE TRIGGER maps_refresh_targets_for_others AFTER UPDATE ON app."maps" FOR EACH ROW EXECUTE FUNCTION app.maps_refresh_targets_for_others();

CREATE OR REPLACE FUNCTION app.nodes_refresh_targets_for_others() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (OLD."accessPolicy" IS DISTINCT FROM NEW."accessPolicy") THEN
		-- simply cause the associated rows in the other tables to have their triggers run again
		UPDATE app."mapNodeEdits" SET "c_accessPolicyTargets" = array[]::text[] WHERE "node" = NEW.id;
		UPDATE app."nodeLinks" SET "c_accessPolicyTargets" = array[]::text[] WHERE "parent" = NEW.id OR "child" = NEW.id;
		UPDATE app."nodePhrasings" SET "c_accessPolicyTargets" = array[]::text[] WHERE "node" = NEW.id;
		UPDATE app."nodeRatings" SET "c_accessPolicyTargets" = array[]::text[] WHERE "node" = NEW.id;
		UPDATE app."nodeRevisions" SET "c_accessPolicyTargets" = array[]::text[] WHERE "node" = NEW.id;
		UPDATE app."nodeTags" SET "c_accessPolicyTargets" = array[]::text[] WHERE NEW.id = ANY("nodes");
		-- todo: handle commandRuns table (delayed until the command-run insertion system is set up)
	END IF;
	RETURN NULL; -- result-value is ignored (since in an AFTER trigger), but must still return something
END $$;
DROP TRIGGER IF EXISTS nodes_refresh_targets_for_others on app."nodes";
CREATE TRIGGER nodes_refresh_targets_for_others AFTER UPDATE ON app."nodes" FOR EACH ROW EXECUTE FUNCTION app.nodes_refresh_targets_for_others();