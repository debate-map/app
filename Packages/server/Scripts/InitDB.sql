/*
Notes:
* When you want to make a schema change, change it here first, then either run the relevant command below (if new table), or manually replicate the change in the live database. (using pgAdmin, or a manual psql command)
*/

--drop schema if exists app_public cascade;
--create schema app_public;

--set search_path to app_public, public;
--ALTER DATABASE "game-dive" SET search_path TO app_public, public;
ALTER DATABASE "game-dive" SET search_path TO app_public;

/*create table "ssb_user_fighter_rankings" (
	"id" text primary key,
	"name" text not null
);
insert into "ssb_fighters" (id, name) values
  ("0000000000000000000001", "Test1"),
  ("0000000000000000000002", "Test2");*/