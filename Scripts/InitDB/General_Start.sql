-- alter the default search-path, so that queries on non-namespaced targets are found in the correct schema (ie. in "app")
ALTER DATABASE "debate-map" SET search_path TO 'app'; -- for future pg-sessions
SELECT pg_catalog.set_config('search_path', 'app', false); -- for current pg-session
-- other search-path-set options
--ALTER ROLE ALL SET search_path = 'app'; -- for future pg-sessions [not needed, so long as each role never had a search_path set]
--SET SCHEMA PATH app; -- for current pg-session [seems not working]

-- options for this session/connection
-- ===========

--SET statement_timeout = 0;
--SET lock_timeout = 0;
--SET idle_in_transaction_session_timeout = 0;
--SET client_encoding = 'UTF8';
--SET standard_conforming_strings = on;
--SET check_function_bodies = false;
--SET xmloption = content;
--SET client_min_messages = warning;
--SET row_security = off;

-- schema creation
-- ==========

CREATE SCHEMA IF NOT EXISTS app;
--ALTER SCHEMA app OWNER TO admin;

-- search/text-match config
-- ==========

CREATE TEXT SEARCH dictionary app.english_stem_nostop (
	Template = snowball,
	Language = english
);

CREATE TEXT SEARCH CONFIGURATION app.english_nostop (COPY = pg_catalog.english);
ALTER TEXT SEARCH CONFIGURATION app.english_nostop
	ALTER mapping for asciiword, asciihword, hword_asciipart, hword, hword_part, word WITH app.english_stem_nostop;

-- create role "admin", and grant it permissions
-- ==========

-- No sql is actually needed for this step, because the "admin" role is created by the crunchydata postgres-operator. (that's my current recollection/understanding anyway)
-- If you are hosting the database independently of crunchydata's wrapper, you'll most likely need to create the role here, looking something like the following: (untested)
-- CREATE ROLE admin WITH SUPERUSER CREATEDB CREATEROLE INHERIT LOGIN PASSWORD 'fill_in_password_here';

-- create role "rls_obeyer", and grant it permissions
-- ==========

do $$ begin
	create role rls_obeyer with noinherit nologin;
EXCEPTION WHEN others THEN
	RAISE NOTICE 'rls_obeyer role seems to exist already, so not re-creating';
end $$;
grant connect on database "debate-map" to rls_obeyer;
grant usage on schema app to rls_obeyer;
--grant all on schema app to rls_obeyer;

-- for future-created tables
alter default privileges in schema app grant select, insert, update, delete on tables to rls_obeyer;
-- for already-created tables
grant select, insert, update, delete on all tables in schema app to rls_obeyer;