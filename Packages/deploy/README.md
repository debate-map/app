# Debate Map (Deploy)

This subrepo/package is for deployment-related configuration and scripts. (other than the generation of the Docker image file, which is currently handled by the "server" package)

## Setup

> Continued from: https://github.com/debate-map/server#setup

### 1) Local server, setup of Crunchydata PGO, Pulumi, and ArgoCD

1) Set up your Postgres Operator. (based on this guide: https://access.crunchydata.com/documentation/postgres-operator/5.0.1/quickstart)  
1.1) Run (in `Packages/deploy`): `kubectl apply -k kustomize/install`  
1.2) Run: `kubectl create namespace dm-pg-operator`  
1.3) Run: `kubectl apply -k kustomize/postgres`
2) Init the db.  
2.1) Start the proxy, so we can make postgres calls directly from Windows: `npm start server.k8s_local_proxyOn8081`  
2.2) Run the init-db script: `npm start initDB_freshScript_k8s`
3) Make the `psql` command available in WSL (you will use it in future):
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

### 2) Remote server, using docker + kubernetes

Note: These instructions are for OVH-cloud's Public Cloud servers.

1) Create a Public Cloud project on OVH cloud. (in the US, us.ovhcloud.com is recommended for their in-country servers)
2) Follow the instructions here to setup a Kubernetes cluster: https://youtu.be/vZOj59Oer7U?t=586  
2.1) In the "node pool" step, select "1". (Debate Map does not currently need more than one node)  
2.2) In the "node type" step, select the cheapest option, Discovery d2-4. (~$12/mo)
3) TODO