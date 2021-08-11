# Debate Map (Server)

Codebase for the Debate Map website's backend ([debatemap.app](https://debatemap.app)).

## Setup

> Continued from: https://github.com/debate-map/app#setup

### General

1) Set up WSL2 and Docker Desktop on Windows: https://kubernetes.io/blog/2020/05/21/wsl-docker-kubernetes-on-the-windows-desktop
2) Temp: Add "type:module" to a number of packages, till they're fixed. (see here: https://github.com/apollographql/apollo-client/pull/8396#issuecomment-894563662)
3) Copy the `.env.template` file in the repo root, rename the copy to `.env`, and fill in the necessary environment-variables. (The sections below will show which of those environment variables are needed, and how to supply them.)

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

Note: The docker images produced directly will have the name `dm-server-direct`.

1) Install Docker Desktop: https://docs.docker.com/desktop
2) Install the Docker "dive" tool (helps for inspecting image contents without starting contianer): https://github.com/wagoodman/dive
2.1) In addition, make a shortcut to `\\wsl$\docker-desktop-data\version-pack-data\community\docker\overlay2`; this is the path you can open in Windows Explorer to view the raw files in the docker-built "layers". (ie. your project's output-files, as seen in the docker builds)
3) For direct docker builds, run `npm start server.dockerBuild`.

### 3) Local server, using docker + kubernetes (k3d/kind) + skaffold (helper)

Note: The docker images produced by skaffold will have the name `dm-server`.

1) Create your Kubernetes cluster in Docker Desktop, k3d, or kind. (For now, Docker Desktop is recommended since its image loading is instant, rather than ~3m for k3d/kind. You can speed up image-loading for k3d/kind by setting up a local registry, but I haven't learned that yet. More info here: https://docs.tilt.dev/choosing_clusters.html)
1.A.1) For Docker Desktop, simply check the "Enable Kubernetes" setting, and apply/restart it.
1.B.1) For k3d, install from here: https://k3d.io/#installation
1.B.2) Set up local kubernetes cluster, using k3d: `k3d cluster create main-1` (in the future, run `k3d cluster start main-1` to start the cluster, and `k3d cluster stop main-1` to stop)
1.C.1) For kind, install from here: https://kind.sigs.k8s.io/docs/user/quick-start
1.C.2) Set up local kubernetes cluster, using kind: `kind create cluster main-1` (in the future, use regular docker commands to start/stop the cluster nodes, eg. `kubectl cluster-info --context kind-main-1`)
1.D) To switch between docker-desktop/k3d/kind, you can use `kubectl config use-context [docker-desktop/k3d-main-1/kind-main-1]`. (or use the "Kubernetes" selector in Docker Desktop's tray-icon)
2) Install Skaffold (trying it out): https://skaffold.dev/docs/install)
3) For docker->kubernetes build+rebuilds, run `npm start server.skaffoldDev`. (whenever you want a rebuild, just press enter in the terminal)
4) For docker->kubernetes builds, run `npm start server.skaffoldBuild`. (image-name: `dm-server`)
5) For docker->kubernetes build+run, run `npm start server.skaffoldRun`. (image-name: `dm-server`)
6) When the list of images in Docker Desktop gets too long, press "Clean up" in the UI, check "Unused", uncheck non-main-series images, then press "Remove". (run after container-trimming to get more matches)
7) When the list of containers in Docker Desktop gets too long, you can trim them using a Powershell script like the below: (based on: https://stackoverflow.com/a/68702985)
```
$containers = (docker container list -a).Split("`n") | % { [regex]::split($_, "\s+") | Select -Last 1 }
$containersToRemove = $containers | Where { ([regex]"^[a-z]+_[a-z]+$").IsMatch($_) }
foreach ($container in $containersToRemove) { docker container rm $container }
```

### 4) Deployment (using Crunchydata PGO, Pulumi, ArgoCD, etc.)

1) Follow the instructions here: <https://github.com/debate-map/app/tree/master/Packages/deploy#setup>

## Editing + running

See here: <https://github.com/debate-map/app#editing--running>

## Database migrations

See here for overview: <https://github.com/Venryx/web-vcore/tree/master/Docs/DatabaseMigrations.md>

Actions:
* To create a new migration, make a copy of the latest migration in `Knex/Migrations`, rename it (incrementing the number), then clear the up/down functions.