-- sync:rs[rls_helpers.rs]

CREATE OR REPLACE FUNCTION is_user_admin_or_creator(user_id varchar, creator_id varchar) RETURNS boolean AS $$ 
	SELECT is_user_admin(user_id) OR is_user_creator(user_id, creator_id);
$$ LANGUAGE sql STABLE LEAKPROOF;

CREATE OR REPLACE FUNCTION is_user_creator(user_id varchar, creator_id varchar) RETURNS boolean AS $$
	SELECT user_id = creator_id OR (user_id = '@me' AND current_setting('app.current_user_id') = creator_id);
$$ LANGUAGE SQL STABLE LEAKPROOF;

CREATE OR REPLACE FUNCTION is_user_admin(user_id varchar) RETURNS boolean AS $$ 
	SELECT ("permissionGroups" -> 'admin')::boolean FROM app."users"
	WHERE id = CASE WHEN user_id = '@me' THEN current_setting('app.current_user_id') ELSE user_id END;
 $$ LANGUAGE sql STABLE LEAKPROOF;

CREATE OR REPLACE FUNCTION does_policy_allow_access(user_id varchar, policy_id varchar, policy_field varchar) RETURNS boolean AS $$
	SELECT coalesce(("permissions" -> policy_field -> 'access')::boolean AND coalesce(("permissions_userExtends" -> user_id -> policy_field -> 'access')::boolean, true), false)
	FROM app."accessPolicies" as pol
	WHERE pol.id = policy_id;
 $$ LANGUAGE sql STABLE LEAKPROOF;

CREATE OR REPLACE FUNCTION do_policies_allow_access(user_id varchar, policy_targets varchar[]) RETURNS boolean AS $$
	SELECT bool_and(("permissions" -> split_part(policy_target, ':', 2) -> 'access')::boolean AND coalesce(("permissions_userExtends" -> user_id -> split_part(policy_target, ':', 2) -> 'access')::boolean, true))
	FROM app."accessPolicies" as pol
	JOIN unnest(policy_targets) AS t(policy_target)
	ON pol.id = split_part(policy_target, ':', 1);
 $$ LANGUAGE sql STABLE LEAKPROOF;