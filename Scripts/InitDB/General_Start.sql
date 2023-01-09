-- alter the default search-path, so that queries on non-namespaced targets are found in the correct schema (ie. in "app") 
ALTER DATABASE "debate-map" SET search_path TO app; -- for future pg-sessions
--SET SCHEMA PATH app; -- for current pg-session
SELECT pg_catalog.set_config('search_path', 'app', false); -- for current pg-session

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

CREATE SCHEMA IF NOT EXISTS app;
--ALTER SCHEMA app OWNER TO admin;

-- search/text-match config
-- ==========

CREATE TEXT search dictionary english_stem_nostop (
	Template = snowball,
	Language = english
);
CREATE TEXT search CONFIGURATION app.english_nostop (COPY = pg_catalog.english);
ALTER TEXT search CONFIGURATION app.english_nostop
	ALTER mapping for asciiword, asciihword, hword_asciipart, hword, hword_part, word WITH english_stem_nostop;