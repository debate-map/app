-- create role "app_user", and grant it permissions
-- ==========

do $$ begin
	create role rls_obeyer with noinherit nologin;
EXCEPTION WHEN others THEN
	RAISE NOTICE 'rls_obeyer role exists, not re-creating';
end $$;
grant connect on database "debate-map" to rls_obeyer;
grant usage on schema app to rls_obeyer;
--grant all on schema app to rls_obeyer;

-- approach 1 (doesn't work, because the "default permissions" are only used for future tables that are made)
--alter default privileges in schema app grant select, insert, update, delete on tables to rls_obeyer;
-- approach 2 (works): loop through all tables, granting permissions
grant select, insert, update, delete on all tables in schema app to rls_obeyer;