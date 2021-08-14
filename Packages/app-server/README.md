# Debate Map (Server)

Codebase for the [Debate Map](https://debatemap.app) website's app-server. (ie. server for graphql, database, etc.)

# Guide modules

> Continued from: https://github.com/debate-map/app#guide-modules

## General

<!----><a name="general"></a>
### [server/general] General

1) Set up WSL2 and Docker Desktop on Windows: https://kubernetes.io/blog/2020/05/21/wsl-docker-kubernetes-on-the-windows-desktop
2) Temp: Add "type:module" to a number of packages, till they're fixed. (see here: https://github.com/apollographql/apollo-client/pull/8396#issuecomment-894563662)
3) Copy the `.env.template` file in the repo root, rename the copy to `.env`, and fill in the necessary environment-variables. (The sections below will show which of those environment variables are needed, and how to supply them.)

## Local

<!----><a name="dev"></a>
### [server/dev] Get dev-server running for Packages/app-server

Prerequisite steps: [vscode](https://github.com/debate-map/app#vscode)

1) In vscode #2, start backend compiler: ctrl+shift+b, then `#1 server.dev`.
2) In vscode #2, start db-shape tracker: ctrl+shift+b, then `#2 server.buildInitDBScript_watch`. (optional)
3) In vscode #2, start backend: ctrl+shift+b, then `#3 server.run`.

<!----><a name="local-base"></a>
### [server/local-base] Local server, base

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

5) Init `debate-map` db in PostgreSQL, by running `yarn start server.initDB`.

<!----><a name="local-docker"></a>
### [server/local-docker] Local server, using docker

Prerequisite steps: [deploy/setup-base](https://github.com/debate-map/app/tree/master/Packages/deploy#setup-base)

Note: The docker images produced directly will have the name `dm-app-server-direct`.

1) For direct docker builds, run `npm start server.dockerBuild`.

## Deployment

Handling of deployment to kubernetes (whether locally or remote) is explained in the [deploy package's readme](https://github.com/Venryx/web-vcore/tree/master/Packages/deploy#guide-modules).

## Shared

<!----><a name="db-migrate"></a>
### [db-migrate] Database migrations

See here for overview: <https://github.com/Venryx/web-vcore/tree/master/Docs/DatabaseMigrations.md>

Actions:
* To create a new migration, make a copy of the latest migration in `Knex/Migrations`, rename it (incrementing the number), then clear the up/down functions.