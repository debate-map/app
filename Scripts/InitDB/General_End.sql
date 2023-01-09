-- create role "rls_obeyer", and grant it permissions
-- ==========

do $$ begin
	create role rls_obeyer with noinherit nologin;
EXCEPTION WHEN others THEN
	RAISE NOTICE 'rls_obeyer role exists, not re-creating';
end $$;
grant connect on database "debate-map" to rls_obeyer;
grant usage on schema app to rls_obeyer;
--grant all on schema app to rls_obeyer;

-- for future-created tables
alter default privileges in schema app grant select, insert, update, delete on tables to rls_obeyer;
-- for already-created tables
grant select, insert, update, delete on all tables in schema app to rls_obeyer;