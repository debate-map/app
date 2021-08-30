# Debate Map (Server)

Codebase for the [Debate Map](https://debatemap.app) website's app-server. (ie. server for graphql, database, etc.)

# Guide modules

> Continued from: https://github.com/debate-map/app#guide-modules

## General

<!----><a name="general"></a>
### [app-server/general] General

* 1\) Temp: Add "type:module" to a number of packages, till they're fixed. (see here: https://github.com/apollographql/apollo-client/pull/8396#issuecomment-894563662)
* 2\) Copy the `.env.template` file in the repo root, rename the copy to `.env`, and fill in the necessary environment-variables. (The sections below will show which of those environment variables are needed, and how to supply them.)

## Local development

See: [deploy/k8s-local](https://github.com/debate-map/app/tree/master/Packages/deploy#k8s-local)

## Remote deployment

See: [deploy/k8s-remote](https://github.com/debate-map/app/tree/master/Packages/deploy#k8s-remote)

## Shared

<!----><a name="db-migrate"></a>
### [app-server/db-migrate] Database migrations

See here for overview: <https://github.com/Venryx/web-vcore/tree/master/Docs/DatabaseMigrations.md>

Actions:
* To create a new migration, make a copy of the latest migration in `Knex/Migrations`, rename it (incrementing the number), then clear the up/down functions.