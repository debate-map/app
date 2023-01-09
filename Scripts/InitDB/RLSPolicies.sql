-- sync:rs[rls_policies.rs]

-- simple RLS policies (where to access, it must be that: user is creator, user is admin, entry's policy allows general access [without user-specific block], or entry's policy has user-specific grant)
-- ==========

alter table app."terms" enable row level security;
do $$ begin
	drop policy if exists "terms_rls" on app."terms";
	create policy "terms_rls" on app."terms" as permissive for all using (
		is_user_admin('@me') or is_user_creator('@me', creator) or does_policy_allow_access('@me', "accessPolicy", 'terms')
	);
end $$;

alter table app."medias" enable row level security;
do $$ begin
	drop policy if exists "medias_rls" on app."medias";
	create policy "medias_rls" on app."medias" as permissive for all using (
		is_user_admin('@me') or is_user_creator('@me', creator) or does_policy_allow_access('@me', "accessPolicy", 'medias')
	);
end $$;

alter table app."maps" enable row level security;
do $$ begin
	drop policy if exists "maps_rls" on app."maps";
	create policy "maps_rls" on app."maps" as permissive for all using (
		is_user_admin('@me') or is_user_creator('@me', creator) or does_policy_allow_access('@me', "accessPolicy", 'maps')
	);
end $$;

alter table app."nodes" enable row level security;
do $$ begin
	drop policy if exists "nodes_rls" on app."nodes";
	create policy "nodes_rls" on app."nodes" as permissive for all using (
		is_user_admin('@me') or is_user_creator('@me', creator) or does_policy_allow_access('@me', "accessPolicy", 'nodes')
	);
end $$;

-- derivative RLS policies (where to access an entry, the RLS policies of its associated objects must all pass)
-- ==========

alter table app."mapNodeEdits" enable row level security;
do $$ begin
	drop policy if exists "mapNodeEdits_rls" on app."mapNodeEdits";
	create policy "mapNodeEdits_rls" on app."mapNodeEdits" as permissive for all using (
		is_user_admin('@me') or do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
end $$;

alter table app."nodeLinks" enable row level security;
do $$ begin
	drop policy if exists "nodeLinks_rls" on app."nodeLinks";
	create policy "nodeLinks_rls" on app."nodeLinks" as permissive for all using (
		is_user_admin('@me') or do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
end $$;

alter table app."nodePhrasings" enable row level security;
do $$ begin
	drop policy if exists "nodePhrasings_rls" on app."nodePhrasings";
	create policy "nodePhrasings_rls" on app."nodePhrasings" as permissive for all using (
		is_user_admin('@me') or do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
end $$;

alter table app."nodeRatings" enable row level security;
do $$ begin
	drop policy if exists "nodeRatings_rls" on app."nodeRatings";
	create policy "nodeRatings_rls" on app."nodeRatings" as permissive for all using (
		is_user_admin('@me') or is_user_creator('@me', creator) or do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
end $$;

alter table app."nodeRevisions" enable row level security;
do $$ begin
	drop policy if exists "nodeRevisions_rls" on app."nodeRevisions";
	create policy "nodeRevisions_rls" on app."nodeRevisions" as permissive for all using (
		is_user_admin('@me') or do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
end $$;

alter table app."nodeTags" enable row level security;
do $$ begin
	drop policy if exists "nodeTags_rls" on app."nodeTags";
	create policy "nodeTags_rls" on app."nodeTags" as permissive for all using (
		is_user_admin('@me') or do_policies_allow_access('@me', "c_accessPolicyTargets")
	);
end $$;

-- unique RLS policies
-- ==========

alter table app."userHiddens" enable row level security;
do $$ begin
	drop policy if exists "userHiddens_rls" on app."userHiddens";
	create policy "userHiddens_rls" on app."userHiddens" as permissive for all using (
		is_user_admin('@me') or id = current_setting('app.current_user_id')
	);
end $$;

alter table app."commandRuns" enable row level security;
do $$ begin
	drop policy if exists "commandRuns_rls" on app."commandRuns";
	create policy "commandRuns_rls" on app."commandRuns" as permissive for all using (
		--current_setting('app.current_user_admin') = 'true'
		is_user_admin('@me') or (
			-- public_base = true, iff the Command class has "canShowInStream" enabled, and the user has "addToStream" enabled (see CommandMacros/General.ts)
			public_base = true
			and do_policies_allow_access('@me', "c_accessPolicyTargets")
		)
	);
end $$;