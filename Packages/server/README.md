# Debate Map (Server)

Codebase for the [Debate Map](https://debatemap.app) website's app-server. (ie. server for graphql, database, etc.)

# Guide modules

> Continued from: https://github.com/debate-map/app#guide-modules

## General

### [server/general] General
<a name="general"></a>

1) Set up WSL2 and Docker Desktop on Windows: https://kubernetes.io/blog/2020/05/21/wsl-docker-kubernetes-on-the-windows-desktop
2) Temp: Add "type:module" to a number of packages, till they're fixed. (see here: https://github.com/apollographql/apollo-client/pull/8396#issuecomment-894563662)
3) Copy the `.env.template` file in the repo root, rename the copy to `.env`, and fill in the necessary environment-variables. (The sections below will show which of those environment variables are needed, and how to supply them.)

## Local

### [server/dev] Get dev-server running for Packages/server
<a name="dev"></a>

Prerequisite steps: [vscode](https://github.com/debate-map/app#vscode)

1) In vscode #2, start backend compiler: ctrl+shift+b, then `#1 server.dev`.
2) In vscode #2, start db-shape tracker: ctrl+shift+b, then `#2 server.buildInitDBScript_watch`. (optional)
3) In vscode #2, start backend: ctrl+shift+b, then `#3 server.run`.

### [server/local-base] Local server, base
<a name="local-base"></a>

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

### [server/local-docker] Local server, using docker
<a name="local-docker"></a>

Note: The docker images produced directly will have the name `dm-server-direct`.

1) Install Docker Desktop: https://docs.docker.com/desktop
2) Install the Docker "dive" tool (helps for inspecting image contents without starting container): https://github.com/wagoodman/dive
2.1) In addition, make a shortcut to `\\wsl$\docker-desktop-data\version-pack-data\community\docker\overlay2`; this is the path you can open in Windows Explorer to view the raw files in the docker-built "layers". (ie. your project's output-files, as seen in the docker builds)
3) For direct docker builds, run `npm start server.dockerBuild`.

### [server/local-k8s] Local server, using docker + kubernetes + skaffold (helper)
<a name="local-k8s"></a>

Note: The docker images produced by skaffold will have the name `dm-server`.

1) Create your Kubernetes cluster in Docker Desktop, by checking "Enable Kubernetes" in the settings, and pressing apply/restart.
2) Install Skaffold: https://skaffold.dev/docs/install
3) For docker->kubernetes build+rebuilds, run `npm start server.skaffoldDev`. (whenever you want a rebuild, just press enter in the terminal)
4) For docker->kubernetes builds, run `npm start server.skaffoldBuild`. (image-name: `dm-server`)
5) For docker->kubernetes build+run, run `npm start server.skaffoldRun`. (image-name: `dm-server`)

### [docker-trim] Docker image/container trimming
<a name="docker-trim"></a>

1) When the list of images in Docker Desktop gets too long, press "Clean up" in the UI, check "Unused", uncheck non-main-series images, then press "Remove". (run after container-trimming to get more matches)
2) When the list of containers in Docker Desktop gets too long, you can trim them using a Powershell script like the below: (based on: https://stackoverflow.com/a/68702985)
```
$containers = (docker container list -a).Split("`n") | % { [regex]::split($_, "\s+") | Select -Last 1 }
$containersToRemove = $containers | Where { ([regex]"^[a-z]+_[a-z]+$").IsMatch($_) }
foreach ($container in $containersToRemove) { docker container rm $container }
```

## Remote

Handling of remote instances of the app-server is explained in the [deploy package's readme](https://github.com/Venryx/web-vcore/tree/master/Packages/deploy#guide-modules).

## Shared

### [db-migrate] Database migrations
<a name="db-migrate"></a>

See here for overview: <https://github.com/Venryx/web-vcore/tree/master/Docs/DatabaseMigrations.md>

Actions:
* To create a new migration, make a copy of the latest migration in `Knex/Migrations`, rename it (incrementing the number), then clear the up/down functions.