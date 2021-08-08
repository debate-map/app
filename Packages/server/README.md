# Debate Map (Server)

Codebase for the Debate Map website's backend ([debatemap.app](https://debatemap.app)).

## Setup

> Continued from: https://github.com/debate-map/app#setup

### Environment variables

Copy the `.env.template` file in the repo root, rename the copy to `.env`, and fill in the necessary environment-variables. (The sections below will show which of those environment variables are needed, and how to supply them.)

### 1) Local server, base

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

### 2) Local server, using docker

Note: The docker images produced directly will have the name `dm_server`.

1) Install Docker Desktop: https://docs.docker.com/desktop
2) Install the Docker "dive" tool (helps for inspecting image contents without starting contianer): https://github.com/wagoodman/dive
2.1) In addition, make a shortcut to `\\wsl$\docker-desktop-data\version-pack-data\community\docker\overlay2`; this is the path you can open in Windows Explorer to view the raw files in the docker-built "layers". (ie. your project's output-files, as seen in the docker builds)
3) For direct docker builds, run `npm start server.dockerBuild`. (image-name: `dm_server`)

### 3) Local server, using docker + kubernetes (k3d/kind) + skaffold (helper)

Note: The docker images produced by skaffold will have the name `packages-server`.

1) Create your cluster in k3d or kind.
1.A.1) For k3d, install from here: https://k3d.io/#installation
1.A.2) Set up local kubernetes cluster, using k3d: `k3d cluster create main-1` (in the future, run `k3d cluster start main-1` to start the cluster, and `k3d cluster stop main-1` to stop)
1.B.1) For kind, install from here: https://kind.sigs.k8s.io/docs/user/quick-start
1.B.2) Set up local kubernetes cluster, using kind: `kind create cluster main-1` (in the future, use regular docker commands to start/stop the cluster nodes, eg. `kubectl cluster-info --context kind-main-1`)
1.C) To switch between k3d and kind, you can use `kubectl config use-context k3d-main-1` and `kubectl config use-context kind-main-1`. (I think this'll work anyway)
2) Install Skaffold (trying it out): https://skaffold.dev/docs/install)
3) For docker->kubernetes build+rebuilds, run `npm start server.skaffoldDev`. (whenever you want a rebuild, wait for previous build to finish, then press enter in the terminal)
4) For docker->kubernetes builds, run `npm start server.skaffoldBuild`. (image-name: `packages-server`)
5) For docker->kubernetes build+run, run `npm start server.skaffoldRun`. (image-name: `packages-server`)

### 4) Remote server, using docker + kubernetes

Note: These instructions are for OVH-cloud's Public Cloud servers.

1) Create a Public Cloud project on OVH cloud. (in the US, us.ovhcloud.com is recommended for their in-country servers)
2) Follow the instructions here to setup a Kubernetes cluster: https://youtu.be/vZOj59Oer7U?t=586
2.1) In the "node pool" step, select "1". (Debate Map does not currently need more than one node)
2.2) In the "node type" step, select the cheapest option, Discovery d2-4. (~$12/mo)
3) TODO

## Editing + running

See here: <https://github.com/debate-map/app#editing--running>

## Database migrations

See here for overview: <https://github.com/Venryx/web-vcore/tree/master/Docs/DatabaseMigrations.md>

Actions:
* To create a new migration, make a copy of the latest migration in `Knex/Migrations`, rename it (incrementing the number), then clear the up/down functions.