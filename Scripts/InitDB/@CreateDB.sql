\set ON_ERROR_STOP 1

-- create the "debate-map" database if it doesn't exist yet (this command cannot be run in the transaction block)
SELECT 'CREATE DATABASE "debate-map"'
	WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'debate-map')\gexec

-- this adds a log to the terminal, letting the user confirm that this sql script has completed (for convenience)
SELECT 'CreateDB script done';