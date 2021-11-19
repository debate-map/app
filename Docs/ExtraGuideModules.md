This file is for guide-modules that "shouldn't ever be needed, for those following the recommended path", but which are kept around in case they become needed. Because they are not expected to be needed, some of these guide-modules may also be outdated/inaccurate.

<!----><a name="local-base"></a>
### [server/local-base] Local server, base

* 1\) Ensure [PostgreSQL](https://www.postgresql.org/) (v10+) is installed.

* 2\) Ensure your PostgreSQL server [has logical decoding enabled](https://www.graphile.org/postgraphile/live-queries/#graphilesubscriptions-lds), by ensuring the following settings are set in `postgresql.conf` (and then restarting PostgreSQL):
```
wal_level = logical
max_wal_senders = 10
max_replication_slots = 10
```
(Note: you can determine where your `postgresql.conf` file is by running `psql template1 -c 'SHOW config_file'`)

* 3\) Ensure the `wal2json` PostgreSQL plugin is installed: https://github.com/eulerto/wal2json#build-and-install

* 4\) Create a Postgres database for this project, by running: `createdb debate-map`

* 5\) Init `debate-map` db in PostgreSQL, by running `yarn start server.initDB`.

<!----><a name="local-docker"></a>
### [server/local-docker] Local server, using docker

Prerequisite steps: [deploy/setup-base](https://github.com/debate-map/app/tree/master/Packages/deploy#setup-base)

Note: The docker images produced directly will have the name `dm-app-server-direct`.

* 1\) For direct docker builds, run `npm start server.dockerBuild`.

<!----><a name="dev"></a>
### [server/dev] Get dev-server running for Packages/app-server

Prerequisite steps: [vscode](https://github.com/debate-map/app#vscode)

* 1\) In vscode #2, start backend compiler: ctrl+shift+b, then `#1 server.dev`.
* 2\) In vscode #2, start db-shape tracker: ctrl+shift+b, then `#2 server.buildInitDBScript_watch`. (optional)
* 3\) In vscode #2, start backend: ctrl+shift+b, then `#3 server.run`.

<!----><a name="local-docker"></a>
### [web-server/local-docker] Local server, using docker

Prerequisite steps: [deploy/setup-base](https://github.com/debate-map/app/tree/master/Packages/deploy#setup-base)

Note: The docker images produced directly will have the name `dm-web-server-direct`.

* 1\) For direct docker builds, run `npm start web-server.dockerBuild`.