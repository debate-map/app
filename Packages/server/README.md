# Debate Map (Server)

Codebase for the Debate Map website's backend ([debatemap.app](https://debatemap.app)).

## Setup

> Continued from: https://github.com/debate-map/app#setup

### Local server

1) Ensure [PostgreSQL](https://www.postgresql.org/) (v10+) is installed.

2) Ensure your PostgreSQL server [has logical decoding enabled](https://www.graphile.org/postgraphile/live-queries/#graphilesubscriptions-lds), by ensuring the following settings are set in `postgresql.conf` (and then restarting PostgreSQL):
```
wal_level = logical
max_wal_senders = 10
max_replication_slots = 10
```
(Note: you can determine where your `postgresql.conf` file is by running `psql template1 -c 'SHOW config_file'`)

3) Ensure the `wal2json` PostgreSQL plugin is installed: https://github.com/eulerto/wal2json#build-and-install

4) Create a Postgres database for this project, by running: `createdb debate-map`

5) Init `debate-map` db in PostgreSQL, by running `yarn start initDB`.

6) Set environment variables for the database's username (PGUSER) and password (PGPASSWORD).

### Remote server

TODO

## Editing + running

See here: <https://github.com/debate-map/app#editing--running>