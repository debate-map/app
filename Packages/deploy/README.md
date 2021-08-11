# Debate Map (Deploy)

This subrepo/package is for deployment-related configuration and scripts. (other than the generation of the Docker image file, which is currently handled by the "server" package)

## Setup

> Continued from: https://github.com/debate-map/server#setup

### 1) Local server, setup of Crunchydata PGO, Pulumi, and ArgoCD

1) Set up your Postgres Operator. (based on this guide: https://access.crunchydata.com/documentation/postgres-operator/5.0.1/quickstart)  
1.1) Run (in `Packages/deploy`): `kubectl apply -k install`  
1.2) Run: `kubectl apply -k postgres`  
1.3) To make future kubectl commands more convenient, run: `kubectl config set-context --current --namespace=dm-pg-operator`  
1.4) If your namespace gets messed up, delete it using this (regular kill command gets stuck): https://github.com/ctron/kill-kube-ns (and if that is insufficient, just reset the whole Kubernetes cluster using Docker Desktop UI)
2) [opt] Make the `psql` command available in WSL (you'll likely want it in the future):
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
3) Init the db.  
3.1) Start the proxy, so we can make postgres calls from Windows (and NodeJS pg plugin): `npm start server.k8s_local_proxyOn8081`  
3.2) To access `psql`, as the "admin" user, run the below...  
3.2.2) In Windows (PS), option A: `$env:PGPASSWORD=$(kubectl -n dm-pg-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}'); psql -h localhost -p 8081 -U admin -d debate-map`  
3.2.2) In Windows (PS), option B: `Add-Type -AssemblyName System.Web; psql "postgresql://admin:$([System.Web.HTTPUtility]::UrlEncode("$(kubectl -n dm-pg-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}')"))@localhost:8081/debate-map"`  
3.2.3) In Linux/WSL, option A: `PGPASSWORD="$(kubectl -n dm-pg-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}')" psql -h localhost -p 8081 -U admin -d debate-map`  
3.2.4) In Linux/WSL, option B: `psql "postgresql://admin:$(printf %s "$(kubectl -n dm-pg-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}')"|jq -sRr @uri)@localhost:8081/debate-map"`  
3.3) To access `psql`, as the "debate-map" user, replace "admin" with "debate-map" and "debate-map-pguser-admin" with "debate-map-pguser-debate-map" in commands above.  
3.4) To access `psql`, as the "postgres" user: I don't know how yet. (I couldn't find a "secrets" entry for it using kubectl)  
3.5) Run the init-db script: `npm start initDB_freshScript_k8s`  

Note: To view the `postgresql.conf` file:
1) Run: `kubectl exec -it $(kubectl get pod -n dm-pg-operator -o name -l postgres-operator.crunchydata.com/cluster=debate-map,postgres-operator.crunchydata.com/role=master) -- bash`
2) Run (in new bash): `cat /pgdata/pg13/postgresql.conf`

* Other files of interest, in same folder: `pg_hba.conf`

### 2) Remote server, using docker + kubernetes

Note: These instructions are for OVH-cloud's Public Cloud servers.

1) Create a Public Cloud project on OVH cloud. (in the US, us.ovhcloud.com is recommended for their in-country servers)
2) Follow the instructions here to setup a Kubernetes cluster: https://youtu.be/vZOj59Oer7U?t=586  
2.1) In the "node pool" step, select "1". (Debate Map does not currently need more than one node)  
2.2) In the "node type" step, select the cheapest option, Discovery d2-4. (~$12/mo)
3) TODO