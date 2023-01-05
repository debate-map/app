-- "pull" triggers, ie. responsive changes to a row's own "c_accessPolicyTargets" field, based on source creation/changes in that same row
-- ==========

CREATE OR REPLACE FUNCTION app_public.map_node_edits_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		--TG_OP = 'INSERT' OR (OLD."c_accessPolicyTargets" IS DISTINCT FROM NEW."c_accessPolicyTargets" AND cardinality(NEW."c_accessPolicyTargets") = 0)
		TG_OP = 'INSERT' OR cardinality(NEW."c_accessPolicyTargets") = 0
		OR OLD."map" IS DISTINCT FROM NEW."map"
		OR OLD."node" IS DISTINCT FROM NEW."node"
	) THEN
		NEW."c_accessPolicyTargets" = array[
			(SELECT concat((SELECT "accessPolicy" FROM "maps" WHERE id = NEW."map"), ':maps')),
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW."node"), ':nodes'))
		];
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS map_node_edits_refresh_targets_for_self on app_public."mapNodeEdits";
CREATE TRIGGER map_node_edits_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app_public."mapNodeEdits" FOR EACH ROW EXECUTE FUNCTION app_public.map_node_edits_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app_public.node_links_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR cardinality(NEW."c_accessPolicyTargets") = 0
		OR OLD."parent" IS DISTINCT FROM NEW."parent"
		OR OLD."child" IS DISTINCT FROM NEW."child"
	) THEN
		NEW."c_accessPolicyTargets" = array[
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW."parent"), ':nodes')),
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW."child"), ':nodes'))
		];
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS node_links_refresh_targets_for_self on app_public."nodeLinks";
CREATE TRIGGER node_links_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app_public."nodeLinks" FOR EACH ROW EXECUTE FUNCTION app_public.node_links_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app_public.node_phrasings_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR cardinality(NEW."c_accessPolicyTargets") = 0
		OR OLD."node" IS DISTINCT FROM NEW."node"
	) THEN
		NEW."c_accessPolicyTargets" = array[
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW."node"), ':nodes'))
		];
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS node_phrasings_refresh_targets_for_self on app_public."nodePhrasings";
CREATE TRIGGER node_phrasings_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app_public."nodePhrasings" FOR EACH ROW EXECUTE FUNCTION app_public.node_phrasings_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app_public.node_ratings_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR cardinality(NEW."c_accessPolicyTargets") = 0
		OR OLD."accessPolicy" IS DISTINCT FROM NEW."accessPolicy"
		OR OLD."node" IS DISTINCT FROM NEW."node"
	) THEN
		NEW."c_accessPolicyTargets" = array[
			(SELECT concat(NEW."accessPolicy", ':nodeRatings')),
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW."node"), ':nodes'))
		];
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS node_ratings_refresh_targets_for_self on app_public."nodeRatings";
CREATE TRIGGER node_ratings_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app_public."nodeRatings" FOR EACH ROW EXECUTE FUNCTION app_public.node_ratings_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app_public.node_revisions_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR cardinality(NEW."c_accessPolicyTargets") = 0
		OR OLD."node" IS DISTINCT FROM NEW."node"
	) THEN
		NEW."c_accessPolicyTargets" = array[
			(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = NEW."node"), ':nodes'))
		];
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS node_revisions_refresh_targets_for_self on app_public."nodeRevisions";
CREATE TRIGGER node_revisions_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app_public."nodeRevisions" FOR EACH ROW EXECUTE FUNCTION app_public.node_revisions_refresh_targets_for_self();

CREATE OR REPLACE FUNCTION app_public.node_tags_refresh_targets_for_self() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (
		TG_OP = 'INSERT' OR cardinality(NEW."c_accessPolicyTargets") = 0
		OR OLD."nodes" IS DISTINCT FROM NEW."nodes"
	) THEN
		NEW."c_accessPolicyTargets" = (
			SELECT array_agg(
				(SELECT concat((SELECT "accessPolicy" FROM "nodes" WHERE id = node_id), ':nodes'))
			) FROM unnest(NEW."nodes") AS node_id
		);
	END IF;
	RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS node_tags_refresh_targets_for_self on app_public."nodeTags";
CREATE TRIGGER node_tags_refresh_targets_for_self BEFORE INSERT OR UPDATE ON app_public."nodeTags" FOR EACH ROW EXECUTE FUNCTION app_public.node_tags_refresh_targets_for_self();

-- todo: handle commandRuns table (delayed until the command-run insertion system is set up)

-- "push" triggers, ie. responsive changes to other tables' "c_accessPolicyTargets" fields, based on source changes in our row (ie. to our "accessPolicy" field)
-- ==========

CREATE OR REPLACE FUNCTION app_public.maps_refresh_targets_for_others() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (OLD."accessPolicy" IS DISTINCT FROM NEW."accessPolicy") THEN
		-- simply cause the associated rows in the other tables to have their triggers run again
		UPDATE app_public."mapNodeEdits" SET "c_accessPolicyTargets" = array[] WHERE "map" = NEW.id;
	END IF;
	RETURN NULL; -- result-value is ignored (since in an AFTER trigger), but must still return something
END $$;
DROP TRIGGER IF EXISTS maps_refresh_targets_for_others on app_public."maps";
CREATE TRIGGER maps_refresh_targets_for_others AFTER UPDATE ON app_public."maps" FOR EACH ROW EXECUTE FUNCTION app_public.maps_refresh_targets_for_others();

CREATE OR REPLACE FUNCTION app_public.nodes_refresh_targets_for_others() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
	IF (OLD."accessPolicy" IS DISTINCT FROM NEW."accessPolicy") THEN
		-- simply cause the associated rows in the other tables to have their triggers run again
		UPDATE app_public."mapNodeEdits" SET "c_accessPolicyTargets" = array[] WHERE "node" = NEW.id;
		UPDATE app_public."nodeLinks" SET "c_accessPolicyTargets" = array[] WHERE "node" = NEW.id;
		UPDATE app_public."nodePhrasings" SET "c_accessPolicyTargets" = array[] WHERE "node" = NEW.id;
		UPDATE app_public."nodeRatings" SET "c_accessPolicyTargets" = array[] WHERE "node" = NEW.id;
		UPDATE app_public."nodeRevisions" SET "c_accessPolicyTargets" = array[] WHERE "node" = NEW.id;
		UPDATE app_public."nodeTags" SET "c_accessPolicyTargets" = array[] WHERE "node" = NEW.id;
		-- todo: handle commandRuns table (delayed until the command-run insertion system is set up)
	END IF;
	RETURN NULL; -- result-value is ignored (since in an AFTER trigger), but must still return something
END $$;
DROP TRIGGER IF EXISTS nodes_refresh_targets_for_others on app_public."nodes";
CREATE TRIGGER nodes_refresh_targets_for_others AFTER UPDATE ON app_public."nodes" FOR EACH ROW EXECUTE FUNCTION app_public.nodes_refresh_targets_for_others();