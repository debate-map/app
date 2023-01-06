-- sync:rs[rls_helpers.rs]

create or replace function is_user_creator(user_id varchar, creator_id varchar) returns boolean as $$ begin 
	IF user_id = '@me' THEN user_id := current_setting('app.current_user_id'); END IF;
	return user_id = creator_id;
end $$ language plpgsql;

create or replace function is_user_admin(user_id varchar) returns boolean as $$ begin
	-- probably todo: go back to an approach like this, once "app.current_user_admin" config-param can be efficiently set by app-server
	--return current_setting('app.current_user_admin') = 'true';
	
	IF user_id = '@me' THEN user_id := current_setting('app.current_user_id'); END IF;
	return exists(
		select 1 from app_public."users" where id = user_id and (
			"permissionGroups" -> 'admin' = 'true'
		)
	);
end $$ language plpgsql;

create or replace function does_policy_allow_access(user_id varchar, policy_id varchar, policy_field varchar) returns boolean as $$ begin 
	IF user_id = '@me' THEN user_id := current_setting('app.current_user_id'); END IF;
	return exists (
		select 1 from app_public."accessPolicies" where id = policy_id and (
			(
				"permissions" -> policy_field -> 'access' = 'true'
				-- the coalesce is needed to handle the case where the deep-field at that path doesn't exist, apparently
				and coalesce("permissions_userExtends" -> user_id -> policy_field -> 'access', 'null'::jsonb) != 'false'
			)
			or "permissions_userExtends" -> user_id -> policy_field -> 'access' = 'true'
		)
	);
end $$ language plpgsql;

create or replace function do_policies_allow_access(user_id varchar, policy_targets varchar[]) returns boolean as $$
declare
	policy_target varchar;
	policy_id varchar;
	policy_subfield varchar;
begin 
	IF user_id = '@me' THEN user_id := current_setting('app.current_user_id'); END IF;

	-- The `c_accessPolicyTargets` fields should always have at least one entry in them; if not, something is wrong, so play it safe and reject access.
	-- (Most tables enforce non-emptiness of this field with a row constraint, but nodeTags is an exception; its associated nodes may be deleted, leaving it without any targets.)
	-- (This line thus serves to prevent "orphaned node-tags" from being visible by non-admins, as well as a general-purpose "second instance" of the non-emptiness check.)
	IF cardinality(policy_targets) = 0 THEN return false; END IF;

	foreach policy_target in array policy_targets loop
		policy_id := (SELECT split_part(policy_target, ':', 1));
		policy_subfield := (SELECT split_part(policy_target, ':', 2));
		if not does_policy_allow_access(user_id, policy_id, policy_subfield) then
			return false;
		end if;
	end loop;
	return true;
end $$ language plpgsql;