-- probably temp; to improve perf, should probably replace with an "app.current_user_admin" config-param, set by the server (which keeps a live-query of list of admin user-ids) 
create or replace function IsUserAdmin(user_id varchar) returns boolean as $$ begin 
	return exists(
		select 1 from app_public."users" where id = user_id and (
			"permissionGroups" -> 'admin' = 'true'
		)
	);
end $$ language plpgsql;

create or replace function IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess(entry_creator varchar, policyID varchar, policyField varchar) returns boolean as $$ begin 
	return (
		current_setting('app.current_user_id') = entry_creator
		--or current_setting('app.current_user_admin') = 'true'
		or IsUserAdmin(current_setting('app.current_user_id'))
		/*or (
			policyFields[0] -> policyField -> 'access' = 'true'
			or policyFields[1] -> current_setting('app.current_user_id') -> policyField -> 'access' = 'true'
		)*/
		or exists (
			select 1 from app_public."accessPolicies" where id = policyID and (
				(
					"permissions" -> policyField -> 'access' = 'true'
					-- the coalesce is needed to handle the case where the deep-field at that path doesn't exist, apparently
					and coalesce("permissions_userExtends" -> current_setting('app.current_user_id') -> policyField -> 'access', 'null'::jsonb) != 'false'
				)
				or "permissions_userExtends" -> current_setting('app.current_user_id') -> policyField -> 'access' = 'true'
			)
		)
	);
end $$ language plpgsql;

create or replace function CanCurrentUserAccessAllNodesInArray(nodes varchar[]) returns boolean as $$
declare
	node varchar;
begin 
	foreach node in array nodes loop
		if not IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.nodes where id = node), 'nodes') then
			return false;
		end if;
	end loop;
	return true;
end $$ language plpgsql;