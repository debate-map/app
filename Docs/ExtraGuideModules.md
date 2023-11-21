This file is for guide-modules that "shouldn't ever be needed, for those following the recommended path", but which are kept around in case they become needed. Because they are not expected to be needed, some of these guide-modules may also be outdated/inaccurate.

<!----><a name="local-base"></a>
### [server/local-base] Local server, base

> Note: The database-configuration steps below are only necessary if you're connecting to a custom/host-device postgres instance; the crunchydata postgres instance in the kubernetes cluster is, by default, configured to already have logical-decoding enabled.

* 1\) Ensure [PostgreSQL](https://www.postgresql.org/) (v13+) is installed.

* 2\) Ensure your PostgreSQL server [has logical decoding enabled](https://www.graphile.org/postgraphile/live-queries/#graphilesubscriptions-lds), by ensuring the following settings are set in `postgresql.conf` (and then restarting PostgreSQL):
```
wal_level = logical
max_wal_senders = 10
max_replication_slots = 10
```
(Note: you can determine where your `postgresql.conf` file is by running `psql template1 -c 'SHOW config_file'`)

* 3\) Ensure the `wal2json` PostgreSQL plugin is installed: https://github.com/eulerto/wal2json#build-and-install [note: as of 2023-11-21, the debate-map app-server was reworked to use pgoutput as its logical-replication plugin, presumably making installation of `wal2json` no longer necessary; haven't yet confirmed if wal2json is needed elsewhere, however]

* 4\) Create a Postgres database for this project, by running: `createdb debate-map`

* 5\) Init `debate-map` db in PostgreSQL, by running `yarn start server.initDB`.

<!----><a name="psql-in-wsl"></a>
### [psql-in-wsl] Set up psql for use in wsl

The `psql` binary is not installed in Linux/WSL at the start. If you want `psql` runnable from within WSL, run the below setup:
```
sudo apt install postgresql-client-common
# make above usable by providing implementation (from: https://stackoverflow.com/a/60923031)
sudo apt update
sudo apt -y upgrade
sudo apt -y install vim bash-completion wget
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ `lsb_release -cs`-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt update
sudo apt -y install postgresql-client-13
```