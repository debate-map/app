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

5) Init `debate-map` db in PostgreSQL, by running `yarn start server.initDB`.

### Remote server

Note: These instructions are for OVH-cloud's Public Cloud servers.

1) Create a Public Cloud project on OVH cloud. (in the US, us.ovhcloud.com is recommended for their in-country servers)
2) Follow the instructions here to setup a Kubernetes cluster: https://youtu.be/vZOj59Oer7U?t=586
2.1) In the "node pool" step, select "1". (Debate Map does not currently need more than one node)
2.2) In the "node type" step, select the cheapest option, Discovery d2-4. (~$12/mo)
3) Install Docker Desktop: https://docs.docker.com/desktop/
4) Install K3D: https://k3d.io/#installation
5) Install the Docker "dive" tool (helps for inspecting image contents without starting contianer): https://github.com/wagoodman/dive
5.1) In addition, make a shortcut to `\\wsl$\docker-desktop-data\version-pack-data\community\docker\overlay2`; this is the path you can open in Windows Explorer to view the raw files in the docker-built "layers". (ie. your project's output-files, as seen in the docker builds)
6) Install Skaffold (trying it out): https://skaffold.dev/docs/install
7) For builds, run `npm start server.dockerBuild`. (If yarn gives an error about being unable to create acquire a lock file, you could try running `server.dockerBuild_noCache` -- though doesn't seem to resolve fix it anyway.)
8) TODO

### Environment variables

Copy the `.env.template` file in the repo root, rename the copy to `.env`, and fill in the necessary environment-variables.

## Editing + running

See here: <https://github.com/debate-map/app#editing--running>

## Database migrations

See here for overview: <https://github.com/Venryx/web-vcore/tree/master/Docs/DatabaseMigrations.md>

Actions:
* To create a new migration, make a copy of the latest migration in `Knex/Migrations`, rename it (incrementing the number), then clear the up/down functions.