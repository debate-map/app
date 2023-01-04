-- alter debate-map database so that commands are able to locate tables in the correct schema, by default (ie. in "app_public") 
ALTER DATABASE "debate-map" SET search_path TO app_public, public;
-- the above applies for future sessions, but not the current one; this next line will apply it to the current session
--SET SCHEMA PATH app_public, public
SELECT pg_catalog.set_config('search_path', 'app_public, public', false);

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

-- scheme creation
-- ==========

CREATE SCHEMA IF NOT EXISTS app_public;
--ALTER SCHEMA app_public OWNER TO admin;

-- search/text-match config
-- ==========

create text search dictionary english_stem_nostop (
	Template = snowball,
	Language = english
);
create text search configuration public.english_nostop (COPY = pg_catalog.english);
alter text search configuration public.english_nostop
	alter mapping for asciiword, asciihword, hword_asciipart, hword, hword_part, word with english_stem_nostop;