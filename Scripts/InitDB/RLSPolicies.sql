-- sync:rs[rls_policies.rs]

-- simple RLS policies (where to access, it must be that: user is creator, user is admin, entry's policy allows general access [without user-specific block], or entry's policy has user-specific grant)
-- ==========

alter table app_public."terms" enable row level security;
do $$ begin
	drop policy if exists "terms_rls" on app_public."terms";
	create policy "terms_rls" on app_public."terms" as permissive for all using (
		is_user_admin('@me') or is_user_creator('@me', creator) or does_policy_allow_access('@me', "accessPolicy", 'terms')
	);
end $$;

DROP TRIGGER IF EXISTS yourtrigger_name on "yourschemaname"."yourtablename";
alter table app_public."terms"

alter table app_public."medias" enable row level security;
do $$ begin
	drop policy if exists "medias_rls" on app_public."medias";
	create policy "medias_rls" on app_public."medias" as permissive for all using (
		is_user_admin('@me') or is_user_creator('@me', creator) or does_policy_allow_access('@me', "accessPolicy", 'medias')
	);
end $$;

alter table app_public."maps" enable row level security;
do $$ begin
	drop policy if exists "maps_rls" on app_public."maps";
	create policy "maps_rls" on app_public."maps" as permissive for all using (
		is_user_admin('@me') or is_user_creator('@me', creator) or does_policy_allow_access('@me', "accessPolicy", 'maps')
	);
end $$;

alter table app_public."nodes" enable row level security;
do $$ begin
	drop policy if exists "nodes_rls" on app_public."nodes";
	create policy "nodes_rls" on app_public."nodes" as permissive for all using (
		is_user_admin('@me') or is_user_creator('@me', creator) or does_policy_allow_access('@me', "accessPolicy", 'nodes')
	);
end $$;

-- derivative RLS policies (where to access an entry, the RLS policies of its associated objects must all pass)
-- ==========

alter table app_public."mapNodeEdits" enable row level security;
do $$ begin
	drop policy if exists "mapNodeEdits_rls" on app_public."mapNodeEdits";
	create policy "mapNodeEdits_rls" on app_public."mapNodeEdits" as permissive for all using (
		is_user_admin('@me') or do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
end $$;

alter table app_public."nodeLinks" enable row level security;
do $$ begin
	drop policy if exists "nodeLinks_rls" on app_public."nodeLinks";
	create policy "nodeLinks_rls" on app_public."nodeLinks" as permissive for all using (
		is_user_admin('@me') or do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
end $$;

alter table app_public."nodePhrasings" enable row level security;
do $$ begin
	drop policy if exists "nodePhrasings_rls" on app_public."nodePhrasings";
	create policy "nodePhrasings_rls" on app_public."nodePhrasings" as permissive for all using (
		is_user_admin('@me') or do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
end $$;

alter table app_public."nodeRatings" enable row level security;
do $$ begin
	drop policy if exists "nodeRatings_rls" on app_public."nodeRatings";
	create policy "nodeRatings_rls" on app_public."nodeRatings" as permissive for all using (
		is_user_admin('@me') or is_user_creator('@me', creator) or do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
end $$;

alter table app_public."nodeRevisions" enable row level security;
do $$ begin
	drop policy if exists "nodeRevisions_rls" on app_public."nodeRevisions";
	create policy "nodeRevisions_rls" on app_public."nodeRevisions" as permissive for all using (
		is_user_admin('@me') or do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
end $$;

alter table app_public."nodeTags" enable row level security;
do $$ begin
	drop policy if exists "nodeTags_rls" on app_public."nodeTags";
	create policy "nodeTags_rls" on app_public."nodeTags" as permissive for all using (
		is_user_admin('@me') or do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
end $$;

-- unique RLS policies
-- ==========

alter table app_public."userHiddens" enable row level security;
do $$ begin
	drop policy if exists "userHiddens_rls" on app_public."userHiddens";
	create policy "userHiddens_rls" on app_public."userHiddens" as permissive for all using (
		is_user_admin('@me') or id = current_setting('app.current_user_id')
	);
end $$;

alter table app_public."commandRuns" enable row level security;
do $$ begin
	drop policy if exists "commandRuns_rls" on app_public."commandRuns";
	create policy "commandRuns_rls" on app_public."commandRuns" as permissive for all using (
		--current_setting('app.current_user_admin') = 'true'
		is_user_admin('@me') or (
			-- public_base = true, iff the Command class has "canShowInStream" enabled, and the user has "addToStream" enabled (see CommandMacros/General.ts)
			public_base = true
			and do_policies_allow_access('@me', "c_accessPolicyTargets")
		)
	);
end $$;