# Debate Map (Deploy)

This subrepo/package is for deployment-related configuration and scripts. (other than the generation of the Docker image file, which is currently handled by the "app-server" package)

## Guide modules

> Continued from: https://github.com/debate-map/app#guide-modules

## General

### [setup-base] Setting up base tools needed for local/remote k8s deployments

1) Install Docker Desktop: https://docs.docker.com/desktop
2) Install Lens, as a general k8s inspection tool: https://k8slens.dev
3) [opt] Install the VSCode [Kubernetes extension](https://marketplace.visualstudio.com/items?itemName=ms-kubernetes-tools.vscode-kubernetes-tools), and connect it with your kubeconfig file (eg. `$HOME/.kube/config`).
4) Create your Kubernetes cluster in Docker Desktop, by checking "Enable Kubernetes" in the settings, and pressing apply/restart.
<!-- 5) Create an alias/copy of the "docker-desktop" k8s context, renaming it to "local". -->
5) Install Tilt: https://github.com/tilt-dev/tilt
6) See here for more helpful tools: https://collabnix.github.io/kubetools

<!----><a name="docker-trim"></a>
### [image-inspect] Docker image/container inspection

Prerequisite steps: [deploy/setup-base](https://github.com/debate-map/app/tree/master/Packages/deploy#setup-base)

Tools:
* Make a shortcut to `\\wsl$\docker-desktop-data\version-pack-data\community\docker\overlay2`; this is the path you can open in Windows Explorer to view the raw files in the docker-built "layers". (ie. your project's output-files, as seen in the docker builds)
* Install the Docker "dive" tool (helps for inspecting image contents without starting container): https://github.com/wagoodman/dive
* To inspect the full file-contents of an image: `docker image save IMAGE_NAME > output.tar` (followed by extraction, eg. using [7-zip](https://www.7-zip.org))

## Local

<!----><a name="local-k8s"></a>
### [deploy/k8s-local] Local server, using docker + kubernetes (built-in) + tilt (helper)

Prerequisite steps: [deploy/setup-base](https://github.com/debate-map/app/tree/master/Packages/deploy#setup-base)

1) Run (in repo root): `tilt up`
2) Wait till Tilt has finished deploying everything to your local k8s cluster. (can use the Tilt webpage/ui, or press `s` in the tilt terminal, to monitor)
2.1) `tilt up` can fail the first several times you try, with error `Build Failed: kubernetes apply: error mapping postgres-operator.crunchydata.com/PostgresCluster3: no matches for kind "PostgresCluster3" in version "postgres-operator.crunchydata.com/v1beta1"`, I think because of a race condition where some of `deploy/postgres` runs before `deploy/install`, or something. To fix, just keep restarting, fiddling with Tilt UI, etc. till the "uncategorized" resource shows green.
2.2) `tilt up` can also fail with the error `Get "https://kubernetes.docker.internal:6443/api?timeout=32s": net/http: TLS handshake timeout`. This most likely just means docker is out of memory (was the cause for me). To resolve: Completely close Docker Desktop, shutdown WSL2 (`wsl --shutdown`), restart Docker Desktop, then rerun `tilt up`. More info: https://stackoverflow.com/a/68779828
3) [temp] Run the init-db script: `npm start initDB_freshScript_k8s`

Notes:
* To make future kubectl commands more convenient, run: `kubectl config set-context --current --namespace=dm-pg-operator`  
* If your namespace gets messed up, delete it using this (regular kill command gets stuck): https://github.com/ctron/kill-kube-ns (and if that is insufficient, just reset the whole Kubernetes cluster using Docker Desktop UI)
* When the list of images/containers in Docker Desktop gets too long, see the [deploy/docker-trim](https://github.com/debate-map/app/tree/master/Packages/deploy#docker-trim) module.

<!----><a name="docker-trim"></a>
### [docker-trim] Docker image/container trimming

Prerequisite steps: [deploy/setup-base](https://github.com/debate-map/app/tree/master/Packages/deploy#setup-base)

1) When the list of images in Docker Desktop gets too long, press "Clean up" in the UI, check "Unused", uncheck non-main-series images, then press "Remove". (run after container-trimming to get more matches)
2) When the list of containers in Docker Desktop gets too long, you can trim them using a Powershell script like the below: (based on: https://stackoverflow.com/a/68702985)
```
$containers = (docker container list -a).Split("`n") | % { [regex]::split($_, "\s+") | Select -Last 1 }
$containersToRemove = $containers | Where { ([regex]"^[a-z]+_[a-z]+$").IsMatch($_) }

# it's recommended to delete in batches, as too many at once can cause issues
$containersToRemove = $containersToRemove | Select-Object -First 30

foreach ($container in $containersToRemove) {
	# sync/wait-based version (slow)
	# docker container rm $container

	# async/background-process version (fast)
	Start-Process -FilePath docker -ArgumentList "container rm $container" -NoNewWindow
}
```

## Remote

<!----><a name="k8s-remote"></a>
### [docker-remote] Docker remote image repository

Note: We use Gitlab's private image repository here, but others could be used.

1) Create a user-account on Gitlab. (if new)
2) Ensure that a Gitlab project exists for the docker-image storage. (ours is here: https://gitlab.com/Venryx/debate-map)
3) Sign in to your Gitlab account, using docker-cli: `docker login registry.gitlab.com -u YOUR_USERNAME`
4) Run the image-deploy scripts for the given image: `npm start backend.dockerBuildAndPush_gitlab.[base/server/web-server]`
5) TODO

<!----><a name="k8s-remote"></a>
### [k8s-remote] Remote web+app server, using docker + kubernetes

Prerequisite steps: [deploy/docker-remote](https://github.com/debate-map/app/tree/master/Packages/deploy#docker-remote)

Note: We use OVHCloud's Public Cloud servers here, but others could be used.

1) Create a Public Cloud project on OVH cloud. (in the US, us.ovhcloud.com is recommended for their in-country servers)
2) Follow the instructions here to setup a Kubernetes cluster: https://youtu.be/vZOj59Oer7U?t=586  
2.1) In the "node pool" step, select "1". (Debate Map does not currently need more than one node)  
2.2) In the "node type" step, select the cheapest option, Discovery d2-4. (~$12/mo)
3) Run the commands needed to integrate the kubeconfig file into your local kube config.
4) Create an alias/copy of the "kubernetes-admin@Main_1" k8s context, renaming it to "ovh".
5) TODO
6) Run: `npm start backend.tiltUp_ovh`

## Shared

<!----><a name="k8s-monitors"></a>
### [k8s-monitors] Various commands/info on monitoring system (prometheus, etc.)

* To open a bash shell in the main prometheus pod: `kubectl exec -it prometheus-k8s-0 -n monitoring -- sh` (or `prometheus-k8s-1`)

<!----><a name="k8s-psql"></a>
### [k8s-psql] How to connect to postgres in your kubernetes cluster, using psql

1) To access `psql`, as the "admin" user, run the below...  
1.1) In Windows (PS), option A: `$env:PGPASSWORD=$(kubectl -n dm-pg-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}'); psql -h localhost -p 3205 -U admin -d debate-map`  
1.2) In Windows (PS), option B: `Add-Type -AssemblyName System.Web; psql "postgresql://admin:$([System.Web.HTTPUtility]::UrlEncode("$(kubectl -n dm-pg-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}')"))@localhost:3205/debate-map"`  
1.3) In Linux/WSL, option A (not working atm; can't access tilt's port-forwards): `PGPASSWORD="$(kubectl -n dm-pg-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}')" psql -h localhost -p 3205 -U admin -d debate-map`  
1.4) In Linux/WSL, option B (not working atm; same reason): `psql "postgresql://admin:$(printf %s "$(kubectl -n dm-pg-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}')"|jq -sRr @uri)@localhost:3205/debate-map"`  
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

1) Run (replacing `app=dm-app-server` with the base name of the pod you want): `kubectl exec -it $(kubectl get pod -n dm-pg-operator -o name -l app=dm-app-server) -- bash`

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