# Debate Map (Deploy)

This subrepo/package is for deployment-related configuration and scripts. (other than the generation of the Docker image file, which is currently handled by the "server" package)

## Guide modules

> Continued from: https://github.com/debate-map/app#guide-modules

## General

### [setup-base] Setting up base tools needed for local/remote k8s deployments

1) Install Docker Desktop: https://docs.docker.com/desktop
2) Install Lens, as a general k8s inspection tool: https://k8slens.dev
3) [opt] Install the Docker "dive" tool (helps for inspecting image contents without starting container): https://github.com/wagoodman/dive
3.1) [opt] In addition, make a shortcut to `\\wsl$\docker-desktop-data\version-pack-data\community\docker\overlay2`; this is the path you can open in Windows Explorer to view the raw files in the docker-built "layers". (ie. your project's output-files, as seen in the docker builds)
4) Create your Kubernetes cluster in Docker Desktop, by checking "Enable Kubernetes" in the settings, and pressing apply/restart.
5) [old:] Install Skaffold: https://skaffold.dev/docs/install
6) Install Tilt: https://github.com/tilt-dev/tilt

## Local

<!----><a name="k8s-local"></a>
### [k8s-local] Local app-server, setup of Crunchydata PGO, Pulumi, and ArgoCD

1) Set up your Postgres Operator. (based on this guide: https://access.crunchydata.com/documentation/postgres-operator/5.0.1/quickstart)  
1.1) Run (in `Packages/deploy`): `kubectl apply -k install`  
1.2) Run: `kubectl apply -k postgres`  
1.3) To make future kubectl commands more convenient, run: `kubectl config set-context --current --namespace=dm-pg-operator`  
1.4) If your namespace gets messed up, delete it using this (regular kill command gets stuck): https://github.com/ctron/kill-kube-ns (and if that is insufficient, just reset the whole Kubernetes cluster using Docker Desktop UI)
2) Start the proxy, so we can make postgres calls from Windows (and the NodeJS pg plugin): `npm start server.k8s_local_proxyOn8081`  
3) Run the init-db script: `npm start initDB_freshScript_k8s`  

## Remote

<!----><a name="k8s-remote"></a>
### [k8s-remote] Remote web+app server, using docker + kubernetes

Note: These instructions are for OVH-cloud's Public Cloud servers.

1) Create a Public Cloud project on OVH cloud. (in the US, us.ovhcloud.com is recommended for their in-country servers)
2) Follow the instructions here to setup a Kubernetes cluster: https://youtu.be/vZOj59Oer7U?t=586  
2.1) In the "node pool" step, select "1". (Debate Map does not currently need more than one node)  
2.2) In the "node type" step, select the cheapest option, Discovery d2-4. (~$12/mo)
3) TODO

## Shared

<!----><a name="k8s-psql"></a>
### [k8s-psql] How to connect to postgres in your kubernetes cluster, using psql

1) To access `psql`, as the "admin" user, run the below...  
1.1) In Windows (PS), option A: `$env:PGPASSWORD=$(kubectl -n dm-pg-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}'); psql -h localhost -p 8081 -U admin -d debate-map`  
1.2) In Windows (PS), option B: `Add-Type -AssemblyName System.Web; psql "postgresql://admin:$([System.Web.HTTPUtility]::UrlEncode("$(kubectl -n dm-pg-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}')"))@localhost:8081/debate-map"`  
1.3) In Linux/WSL, option A: `PGPASSWORD="$(kubectl -n dm-pg-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}')" psql -h localhost -p 8081 -U admin -d debate-map`  
1.4) In Linux/WSL, option B: `psql "postgresql://admin:$(printf %s "$(kubectl -n dm-pg-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}')"|jq -sRr @uri)@localhost:8081/debate-map"`  
2) To access `psql`, as the "debate-map" user, replace "admin" with "debate-map" and "debate-map-pguser-admin" with "debate-map-pguser-debate-map" in commands above.  
3) To access `psql`, as the "postgres" user: I don't know how yet. (I couldn't find a "secrets" entry for it using kubectl)  

Note: The `psql` binary is not installed in Linux/WSL at the start. If you want `psql` runnable from within WSL, run the below setup:
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

<!----><a name="k8s-view-pg-config"></a>
### [k8s-view-pg-config] How to view various postgres config files in the kubernetes cluster

To view the pg config files `postgresql.conf`, `pg_hba.conf`, etc.:
1) Run: `kubectl exec -it $(kubectl get pod -n dm-pg-operator -o name -l postgres-operator.crunchydata.com/cluster=debate-map,postgres-operator.crunchydata.com/role=master) -- bash`
2) Run (in new bash): `cat /pgdata/pg13/XXX`

<!----><a name="k8s-view-locals"></a>
### [k8s-view-locals] How to view local files of server/web-server/etc. pods

1) Run (replacing `app=dm-server` with the base name of the pod you want): `kubectl exec -it $(kubectl get pod -n dm-pg-operator -o name -l app=dm-server) -- bash`

<!----><a name="oauth-setup"></a>
### [oauth-setup] How to set up oauth

In order to use the oauth options for sign-in (eg. Google Sign-in), the frontend either must be running on `localhost:[3005/31005]`, or you have to create your own online "application" configs/entries on each of the oauth-providers' platforms. The below instructions are for creating those "application" configs/entries.

Google Sign-in:
1) Create a Google Cloud project for your fork.
2) Go to: https://console.cloud.google.com/apis/credentials?project=YOUR_PROJECT_NAME
3) In the "Credentials->OAuth 2.0 Client IDs" section, create a new "Web Application" entry.
4) Set the values below:
```
Authorized JavaScript Origins:
* http://localhost
* http://localhost:3005
* http://localhost:31005
* http://[::1]:3005
* http://[::1]:31005

Authorized redirect URIs:
* http://localhost:3105/auth/google/callback
* http://localhost:31105/auth/google/callback
* http://[::1]:3105/auth/google/callback
* http://[::1]:31105/auth/google/callback
```