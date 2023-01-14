-- sync:rs[rls_helpers.rs]

CREATE OR REPLACE FUNCTION is_user_admin_or_creator(user_id varchar, creator_id varchar) RETURNS boolean AS $$ BEGIN 
	RETURN is_user_admin(user_id) OR is_user_creator(user_id, creator_id);
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_user_creator(user_id varchar, creator_id varchar) RETURNS boolean AS $$ BEGIN 
	IF user_id = '@me' THEN user_id := current_setting('app.current_user_id'); END IF;
	RETURN user_id = creator_id;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_user_admin(user_id varchar) RETURNS boolean AS $$ BEGIN
	-- probably todo: go back to an approach like this, once "app.current_user_admin" config-param can be efficiently set by app-server
	--RETURN current_setting('app.current_user_admin') = 'true';
	
	IF user_id = '@me' THEN user_id := current_setting('app.current_user_id'); END IF;
	RETURN EXISTS(
		SELECT 1 FROM app."users" WHERE id = user_id AND (
			"permissionGroups" -> 'admin' = 'true'
		)
	);
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION does_policy_allow_access(user_id varchar, policy_id varchar, policy_field varchar) RETURNS boolean AS $$ BEGIN
	IF user_id = '@me' THEN user_id := current_setting('app.current_user_id'); END IF;
	RETURN EXISTS(
		SELECT 1 FROM app."accessPolicies" WHERE id = policy_id AND (
			(
				"permissions" -> policy_field -> 'access' = 'true'
				-- the coalesce is needed to handle the case where the deep-field at that path doesn't exist, apparently
				AND coalesce("permissions_userExtends" -> user_id -> policy_field -> 'access', 'null'::jsonb) != 'false'
			)
			OR "permissions_userExtends" -> user_id -> policy_field -> 'access' = 'true'
		)
	);
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION do_policies_allow_access(user_id varchar, policy_targets varchar[]) RETURNS boolean AS $$
DECLARE
	policy_target varchar;
	policy_id varchar;
	policy_subfield varchar;
BEGIN 
	IF user_id = '@me' THEN user_id := current_setting('app.current_user_id'); END IF;

	-- The `c_accessPolicyTargets` fields should always have at least one entry in them; if not, something is wrong, so play it safe and reject access.
	-- (Most tables enforce non-emptiness of this field with a row constraint, but nodeTags is an exception; its associated nodes may be deleted, leaving it without any targets.)
	-- (This line thus serves to prevent "orphaned node-tags" from being visible by non-admins, as well as a general-purpose "second instance" of the non-emptiness check.)
	IF cardinality(policy_targets) = 0 THEN RETURN false; END IF;

	foreach policy_target in array policy_targets LOOP
		policy_id := (SELECT split_part(policy_target, ':', 1));
		policy_subfield := (SELECT split_part(policy_target, ':', 2));
		IF NOT does_policy_allow_access(user_id, policy_id, policy_subfield) THEN
			RETURN false;
		END IF;
	END LOOP;
	RETURN true;
END $$ LANGUAGE plpgsql;