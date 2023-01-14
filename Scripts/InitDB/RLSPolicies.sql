-- sync:rs[rls_policies.rs]

-- simple RLS policies (where to access, it must be that: user is admin, user is creator, or entry's RLS policy allows access)
-- ==========

ALTER TABLE app."maps" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
	DROP POLICY IF EXISTS "maps_rls" ON app."maps";
	CREATE POLICY "maps_rls" ON app."maps" AS PERMISSIVE FOR ALL USING (
		is_user_admin_or_creator('@me', creator) OR does_policy_allow_access('@me', "accessPolicy", 'maps')
	);
END $$;

ALTER TABLE app."medias" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
	DROP POLICY IF EXISTS "medias_rls" ON app."medias";
	CREATE POLICY "medias_rls" ON app."medias" AS PERMISSIVE FOR ALL USING (
		is_user_admin_or_creator('@me', creator) OR does_policy_allow_access('@me', "accessPolicy", 'medias')
	);
END $$;

ALTER TABLE app."nodes" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
	DROP POLICY IF EXISTS "nodes_rls" ON app."nodes";
	CREATE POLICY "nodes_rls" ON app."nodes" AS PERMISSIVE FOR ALL USING (
		is_user_admin_or_creator('@me', creator) OR does_policy_allow_access('@me', "accessPolicy", 'nodes')
	);
END $$;

ALTER TABLE app."terms" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
	DROP POLICY IF EXISTS "terms_rls" ON app."terms";
	CREATE POLICY "terms_rls" ON app."terms" AS PERMISSIVE FOR ALL USING (
		is_user_admin_or_creator('@me', creator) OR does_policy_allow_access('@me', "accessPolicy", 'terms')
	);
END $$;

-- derivative RLS policies (where to access, it must be that: user is admin, user is creator, or all of the associated RLS policies must pass)
-- ==========

ALTER TABLE app."nodeLinks" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
	DROP POLICY IF EXISTS "nodeLinks_rls" ON app."nodeLinks";
	CREATE POLICY "nodeLinks_rls" ON app."nodeLinks" AS PERMISSIVE FOR ALL USING (
		is_user_admin_or_creator('@me', creator) OR do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
END $$;

ALTER TABLE app."nodePhrasings" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
	DROP POLICY IF EXISTS "nodePhrasings_rls" ON app."nodePhrasings";
	CREATE POLICY "nodePhrasings_rls" ON app."nodePhrasings" AS PERMISSIVE FOR ALL USING (
		is_user_admin_or_creator('@me', creator) OR do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
END $$;

ALTER TABLE app."nodeRatings" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
	DROP POLICY IF EXISTS "nodeRatings_rls" ON app."nodeRatings";
	CREATE POLICY "nodeRatings_rls" ON app."nodeRatings" AS PERMISSIVE FOR ALL USING (
		is_user_admin_or_creator('@me', creator) OR do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
END $$;

ALTER TABLE app."nodeRevisions" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
	DROP POLICY IF EXISTS "nodeRevisions_rls" ON app."nodeRevisions";
	CREATE POLICY "nodeRevisions_rls" ON app."nodeRevisions" AS PERMISSIVE FOR ALL USING (
		is_user_admin_or_creator('@me', creator) OR do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
END $$;

ALTER TABLE app."nodeTags" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
	DROP POLICY IF EXISTS "nodeTags_rls" ON app."nodeTags";
	CREATE POLICY "nodeTags_rls" ON app."nodeTags" AS PERMISSIVE FOR ALL USING (
		is_user_admin_or_creator('@me', creator) OR do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
END $$;

-- unique RLS policies
-- ==========

ALTER TABLE app."mapNodeEdits" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
	DROP POLICY IF EXISTS "mapNodeEdits_rls" ON app."mapNodeEdits";
	CREATE POLICY "mapNodeEdits_rls" ON app."mapNodeEdits" AS PERMISSIVE FOR ALL USING (
		--is_user_admin_or_creator('@me', creator) OR do_policies_allow_access('@me', "c_accessPolicyTargets") -- has no "creator" field (maybe should change that...)
		is_user_admin('@me') OR do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
END $$;

ALTER TABLE app."userHiddens" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
	DROP POLICY IF EXISTS "userHiddens_rls" ON app."userHiddens";
	CREATE POLICY "userHiddens_rls" ON app."userHiddens" AS PERMISSIVE FOR ALL USING (
		is_user_admin('@me') OR id = current_setting('app.current_user_id')
	);
END $$;

ALTER TABLE app."commandRuns" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
	DROP POLICY IF EXISTS "commandRuns_rls" ON app."commandRuns";
	CREATE POLICY "commandRuns_rls" ON app."commandRuns" AS PERMISSIVE FOR ALL USING (
		--current_setting('app.current_user_admin') = 'true'
		is_user_admin('@me') OR (
			-- public_base = true, iff the Command class has "canShowInStream" enabled, and the user has "addToStream" enabled (see CommandMacros/General.ts)
			public_base = true
			AND do_policies_allow_access('@me', "c_accessPolicyTargets")
		)
	);
END $$;