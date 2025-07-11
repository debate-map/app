# Debate Map

Monorepo for the client, server, etc. of the Debate Map website ([debatemap.app](https://debatemap.app)).

# Overview

The [Debate Map](https://debatemap.app) project is a web platform aimed at improving the efficiency of discussion and debate. It's crowd-sourced and open-source, and welcomes reader contributions.

Its primary improvements are (in short):
* Restructuring dialogue to make use of both dimensions.
* Breaking down lines of reasoning into single-sentence "nodes".
* Providing rich tools that operate on those nodes -- such as rating, tagging, statistical analysis, and belief-tree sharing and comparison.

The maps are constructed from "claims" (gray), and "arguments" (green and red) which support/oppose those claims. This structure cuts down on reading time, and lets us focus on the underlying chains of reasoning instead of parsing statement meanings and connections.

For more information, visit the website at: <https://debatemap.app>

# Contributing

Areas where help would be welcome:
* Completing development tasks in TypeScript (frontend) or Rust (backend). You can find a [structured view here](https://github.com/orgs/debate-map/projects/1/views/1), or the unstructured [list of tasks/issues here](https://github.com/debate-map/app/issues).
* Contributing to the content on the debate-map website. (eg. expanding existing maps, creating new ones, improving phrasing or organization, voting on existing claims/arguments)
* Assisting with creation of videos demonstrating site functionality and usefulness. (whether creating your own, or getting in touch to assist with a video-series I'm working on for YouTube)
* Providing feedback on the site (or general direction of debate-mapping tools) by joining the [Canonical Debate Lab slack server](https://join.slack.com/t/canonicaldebatelab/shared_invite/zt-408acfmb-qhowbidwY0aKaET7wP_IEQ). (Debate Map is one of several projects associated with the CDL group)

# Associated projects

### Society Library

Development of Debate Map is partially supported by [The Society Library](https://www.societylibrary.org), which is co-developing a separate infrastructural standard within Debate Map for its use.

# Freeform documentation

* [**Quick start**](https://github.com/debate-map/app/tree/main/Docs/QuickStart.md) (new devs should start here)
* [Coding style](https://github.com/debate-map/app/tree/main/Docs/CodingStyle.md)
* [General conventions](https://github.com/debate-map/app/tree/main/Docs/GeneralConventions.md)
* [Authentication](https://github.com/debate-map/app/tree/main/Docs/Authentication.md) (outdated)
* [Access policies](https://github.com/debate-map/app/tree/main/Docs/AccessPolicies.md) (slightly outdated)
* [User reputation](https://github.com/debate-map/app/tree/main/Docs/UserReputation.md) (ideas phase)
* [Node revisions](https://github.com/debate-map/app/tree/main/Docs/NodeRevisions.md) (outdated)
* [Migration notes](https://github.com/debate-map/app/tree/main/Docs/MigrationNotes.md)
* [Package code-syncing](https://github.com/debate-map/app/tree/main/Docs/PackageCodeSyncing.md)
* [Local dependency changes](https://github.com/debate-map/app/tree/main/Docs/LocalDependencyChanges.md)
* [Compilation speed](https://github.com/debate-map/app/tree/main/Docs/CompilationSpeed.md)
* [Common issues](https://github.com/debate-map/app/tree/main/Docs/CommonIssues.md)

# Packages

* [client](https://github.com/debate-map/app/tree/main/Packages/client): Frontend code that runs in the browser; connects to the `app-server` pod. (and the `monitor-backend` pod, if the user is an admin) \[TypeScript]
* [web-server](https://github.com/debate-map/app/tree/main/Packages/web-server): Serves the static frontend files for the website -- see "client" package above. \[Rust]
* [app-server](https://github.com/debate-map/app/tree/main/Packages/app-server): Serves database queries and backend commands. \[Rust]
* [monitor-client](https://github.com/debate-map/app/tree/main/Packages/monitor-client): Frontend code for `debatemap.app/monitor`; see `monitor-backend` for more info. \[TypeScript]
* [monitor-backend](https://github.com/debate-map/app/tree/main/Packages/monitor-backend): Backend code for `debatemap.app/monitor`, which is meant for admin-related functionality, and has several unique design goals (see [here](https://github.com/debate-map/app/tree/main/Packages/monitor-backend#design-goals)). \[Rust]
* [js-common](https://github.com/debate-map/app/tree/main/Packages/js-common): Code shared between JS packages in repo, mainly holding the JS versions of the DB data-structures. \[TypeScript]
* [web-vcore](https://github.com/debate-map/app/tree/main/Packages/web-vcore): Some common frontend code; shared between various packages. (both in and out of repo) \[TypeScript]
* [load-tester](https://github.com/debate-map/app/tree/main/Packages/load-tester): Load/stress testing scripts, to run with k6 on a local DM cluster/instance.
* [deploy](https://github.com/debate-map/app/tree/main/Packages/deploy): Miscellaneous scripts and such, used in the deployment process.
* [rust-shared](https://github.com/debate-map/app/tree/main/Packages/rust-shared): Code shared between the various Rust packages. \[Rust]
* [rust-macros](https://github.com/debate-map/app/tree/main/Packages/rust-macros): Procedural macros used by other Rust packages. (proc-macros can't be used from the crate they're defined in) \[Rust]
<!--
// planned packages
* [graphlink-server](https://github.com/debate-map/app/tree/main/Packages/graphlink-server): Library providing a GraphQL endpoint based on a PostgreSQL database, with support for live-queries. (Rust) [to be split into separate repo]
-->

# Guide modules

* Note: The section below is for the "active guide modules" that are likely to be used. Ones unlikely to be used are placed in the [ExtraGuideModules.md](https://github.com/debate-map/app/tree/main/Docs/ExtraGuideModules.md) file.
* Tip: You can link someone to a specific guide-module by adding `#MODULE_NAME` to the end of the url. (eg: `https://github.com/debate-map/app#setup-general`)
* Tip: If you want to search the text of collapsed guide-modules, you can either view the [readme's source text](https://github.com/debate-map/app/blob/main/README.md?plain=1), or open the dev-tools "Elements" tab and use its ctrl+f search function.





## For all/most contributors

### Tasks (one-time, or very rare)

<!----><a name="setup-general"></a>
<details><summary><b>[setup-general] General repo setup</b></summary>

* 1\) Ensure [NodeJS](https://nodejs.org) (v14.13.0+) is installed, as well as [Yarn](https://yarnpkg.com/getting-started/install) needed for Yarn workspaces.
	* Note: Installation of a new command-line tool generally requires that you restart your terminal/IDE in order for its binaries to be accessible simply by name (assuming the installer has added its folder to the `Path` environment-variable automatically). So if a step fails due to "Command X is not recognized", check this first. (To save space, this "restart your terminal/IDE before proceeding" note will not be repeated in other guide-modules/steps.)
* 2\) Clone/download this repo to disk. (https://github.com/debate-map/app.git)
* 3\) Install this repo's dependencies by running: `yarn install`
* 4\) There is an ugly additional step that used to be required here, relating to a messy transition in the NPM ecosystem from commonjs to esm modules. For now, this issue is being worked around in this repo through use of [these](https://github.com/debate-map/app/tree/main/patches) and [these](https://github.com/Venryx/web-vcore/tree/master/patches) patch files (which are auto-applied by npm/yarn). However, if you get strange webpack/typescript build errors relating to commonjs/esm modules, it's probably related to [this issue](https://github.com/apollographql/apollo-client/pull/8396#issuecomment-894563662), which may then require another look at the patch files (or attempting to find a more reliable solution).
* 5\) Copy the `.env.template` file in the repo root, rename the copy to `.env`, and fill in the necessary environment-variables. At the moment, regular frontend and backend devs don't need to make any modifications to the new `.env` file; only backend deployers/maintainers (ie. those pushing changes to the cloud for production) have environment-variables they need to fill in.

> If you're looking for a higher-level "quick start" guide, see here: [Quick start](https://github.com/debate-map/app/tree/main/Docs/QuickStart.md)

</details>

<!----><a name="vscode"></a>
<details><summary><b>[vscode] VSCode window setup</b></summary>

Prerequisite steps: [setup-general](#setup-general)

It's recommended to split your dev setup into two vscode windows:
* 1\) Window #1 in the `Packages` folder. Use this window to open files in `Packages/client`. (opening files in `Packages/js-common` is also fine)
* 2\) Window #2 in the repo root, for everything else. (server development, deployment, etc.)

Reasons:
* About half of the development work is done in `Packages/client`, since it is the "driver" of most changes/functionality. And having the workload split between the two windows (by "area of concern"), helps maintain tab-count sanity, and clarity of where a given file/tab should be located.
* A separate `tasks.json` file has been set up for the two folders, optimized for the frontend and backend "areas of concern"; by opening both vscode windows/instances, it's thus faster/easier to complete some guide-modules.

</details>





### Tasks (occasional)





### Tasks (frequent)





### Miscellaneous

<!----><a name="project-service-urls"></a>
<details><summary><b>[project-service-urls] Project service urls (ie. where app contents are served) </b></summary>

Local:
* `localhost:5100`: local (k8s), web-server (`backend.[forward/tiltUp]_local` must be running)
* `localhost:5100/app-server`: local (k8s), app-server (`backend.[forward/tiltUp]_local` must be running)
* `localhost:5100/monitor`: local (k8s), monitor-backend (with web-serving of monitor-client's files) (`backend.[forward/tiltUp]_local` must be running)
* `localhost:5100/grafana`: remote (k8s), grafana ui (`backend.[forward/tiltUp]_local` must be running)
* `localhost:5101`: local (webpack), webpack [in place of web-server] (`client.dev` must be running)
* `localhost:5120`: local (k8s), postgres instance (`backend.[forward/tiltUp]_local` must be running)
* `localhost:5131`: local (webpack), monitor-client (webpack web-server) (`monitorClient.dev` must be running)
* `localhost:5140`: local (k8s), hyperknowledge server (experimental backend) (`backend.[forward/tiltUp]_local` must be running)
* `localhost:5141`: local (k8s), hyperknowledge postgres (`backend.[forward/tiltUp]_local` must be running)
* `localhost:5150`: local (k8s), pyroscope (`backend.[forward/tiltUp]_local` must be running)

Remote (private port-forwards/proxies):
* `localhost:5200`: remote (k8s), web-server (`backend.[forward/tiltUp]_ovh` must be running)
* `localhost:5200/app-server`: remote (k8s), app-server (`backend.[forward/tiltUp]_ovh` must be running)
* `localhost:5200/monitor`: remote (k8s), monitor-backend (with web-serving of monitor-client's files) (`backend.[forward/tiltUp]_ovh` must be running)
* `localhost:5200/grafana`: remote (k8s), grafana ui (`backend.[forward/tiltUp]_ovh` must be running)
* `localhost:5220`: remote (k8s), postgres instance (`backend.[forward/tiltUp]_ovh` must be running)
* `localhost:5240`: remote (k8s), hyperknowledge server (experimental backend) (`backend.[forward/tiltUp]_ovh` must be running)
* `localhost:5241`: remote (k8s), hyperknowledge postgres (`backend.[forward/tiltUp]_ovh` must be running)
* `localhost:5250`: remote (k8s), pyroscope (`backend.[forward/tiltUp]_ovh` must be running)

Remote (public):
* `debatemap.app`: remote (k8s), web-server
* `debatemap.app/app-server`: remote (k8s), app-server
* `debatemap.app/monitor`: remote (k8s), monitor-backend (with web-serving of monitor-client's files)

Port-assignment scheme: (ie. meaning of each digit in `ABCD`)
* A) app/project [5: debate-map]
* B) cluster [0: skipped, 1: local, 2: remote] (0 is skipped to avoid clashes with common ports, eg. 5000 for UPnP)
* C) pod [0: web-server, 1: app-server, 2: postgres instance, 3: monitor, 4: hyperknowledge, 5: pyroscope, 9: tilt]
* D) variant [0: main, 1: served from webpack, etc.]

> Note: Not all web-accessible k8s services are shown in the list above. Specifically:
> * Mere "subcomponents" of the monitoring service: grafana, prometheus, alertmanager (Reason: They're accessible through the monitor tool's subpages/iframes. See [Domains.ts](https://github.com/debate-map/app/blob/main/Packages/js-common/Source/Utils/General/Domains.ts) or [domains.rs](https://github.com/debate-map/app/blob/main/Packages/rust-shared/src/domains.rs) for more details.)

</details>





## For frontend developers (coding UI, etc.)





### Tasks (one-time, or very rare)

<!----><a name="dev-enhance"></a>
<details><summary><b>[dev-enhance] Enhance the local web-server dev experience</b></summary>

* 1\) [opt] Install: [React Development Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
* 2\) [opt] Install: [MobX Development Tools](https://chrome.google.com/webstore/detail/mobx-developer-tools/pfgnfdagidkfgccljigdamigbcnndkod) (or [my fork](https://github.com/Venryx/mobx-devtools-advanced))

</details>





### Tasks (occasional)





### Tasks (frequent)

<!----><a name="run-frontend-local"></a>
<details><summary><b>[run-frontend-local] How to run frontend codebase, for local development</b></summary>

Prerequisite steps: [setup-general](#setup-general)

* 1\) If this is the first run, or if you've made code changes, run: `npm start client.tsc` (has vsc-1 task), for the ts->js transpilation (leave running in background)
* 2\) Start the serving of the frontend files. (ie. the js files generated by step 1, along with images and such)
	* 2.1\) Option 1, using webpack directly: **(faster, and recommended atm)**
		* 2.1.1\) Run `npm start client.dev` (has vsc-1 task), for the webpack bundle-building (and serving to `localhost:5101`). (leave running in background)
	* 2.2\) Option 2, using the web-server package within k8s: [if going this route, first follow the [setup-k8s](#setup-k8s) module]
		* 2.2.1\) If this is the first run, or if you've made code changes, build the frontend's webpack bundle into an actual file, in production mode, by running `npm start client.build.prodQuick` (has vsc-1 task).
		* 2.2.2\) Run (in repo root): `npm start backend.tiltUp_local`
		* 2.2.3\) Wait till Tilt has finished deploying everything to your local k8s cluster. (to monitor, press space to open the Tilt web-ui, or `s` for an in-terminal display)
* 3\) Open the locally-served frontend, by opening in your browser: `localhost:5101` (webpack), or `localhost:5100` (k8s web-server) (if you want to connect to the remote db, add `?db=prod` to the end of the url)

> For additional notes on using Tilt, see here: [tilt-notes](#tilt-notes)

</details>





### Miscellaneous

<!----><a name="tilt-notes"></a>
<details><summary><b>[tilt-notes] Notes on using Tilt</b></summary>

Prerequisite steps: [setup-backend](#setup-backend)

Notes:
* When making changes to files, and with Tilt live-updating the files in the pods, you may occasionally start hitting the error `Build Failed: error during connect` or `Build Failed: [...] Error response from daemon` or `Get "https://kubernetes.docker.internal:6443/api[...]": net/http: TLS handshake timeout`. Not completely sure what causes it (see my SO comment [here](https://stackoverflow.com/a/68779828)), but I'm guessing the tilt-updating mechanism is overwhelming Docker Desktop's kubernetes system somehow. To fix:
	* Option 1 (recommended): Completely close Docker Desktop, shutdown WSL2 (`wsl --shutdown`) [not always necessary], restart Docker Desktop, then rerun `npm start backend.tiltUp_local`.
	* Option 2 (sometimes fails): Right click the Docker Desktop tray-icon and press "Restart Docker".
* **Manually restarting the "pgo" resource will clear the database contents! Use with caution.**

</details>





## For backend developers (coding app-server, web-server, etc.)





### Tasks (one-time, or very rare)

<!----><a name="setup-backend"></a>
<details><summary><b>[setup-backend] Setting up base tools needed for local/remote k8s deployments</b></summary>

Required:
* 1\) Install Rust via the `rustup` toolkit.
	* 1.1\) Install rustup (installer/updater for rust toolchains): https://www.rust-lang.org/tools/install
	* 1.2\) Install rust by running (in repo root): `rustc --version` (rustup installs the version specified in `rust-toolchain.toml`)
	* 1.3\) If using VSCode (or another compatible IDE), it's highly recommended to install the [Rust Analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) extension.
	* 1.4\) If on Linux, it's recommended to install the clang compiler-frontend and mold linker. This lets you compile the rust crates outside of docker, and for rust-analyzer to run without errors (they both try to use clang+mold due to `.cargo/config.toml`). [An alternative is to comment out the linux sections in `.cargo/config.toml`, though that means file divergence and slower compilations.]
		* 1.4.1\) Install clang: `sudo apt install clang`
		* 1.4.2\) Install mold: `sudo apt install mold` (if your distro doesn't include mold, refer to the [mold GitHub repo](https://github.com/rui314/mold))
* 2\) Install Docker + Kubernetes + kubectl, by following the [setup-k8s](#setup-k8s) module.
* 3\) Install Tilt: https://github.com/tilt-dev/tilt#install-tilt (as of ?, I'm on version 0.30.13)
	* 3.1\) If the `tilt` binary was not already added to your `Path` environment variable (depends on install path), do so.
* 4\) Install Helm (used during k8s deployment), v3.10.3+: https://helm.sh/docs/intro/install
	* 4.1\) On Windows, recommended install steps:
		* 4.1.1\) Install [Chocolatey](https://chocolatey.org/install). (if `choco` command not already present)
		* 4.1.2\) Run: `choco install kubernetes-helm`
	* 4.2\) On Linux, recommended install route (see link above for alternatives): `sudo snap install helm --classic`

Highly recommended: (frontend devs can skip, if setting up a minimal local backend)
* 1\) Install [Lens](https://k8slens.dev), a very handy, general-purpose k8s inspection tool. 
	* Note: As of 2024-05-06, installing Lens from the Snap store is not recommended, due to a homepage error that causes very slow startup. [Installing it using apt](https://docs.k8slens.dev/getting-started/install-lens/#install-lens-desktop-from-the-apt-repository) does not seem to have this issue.
* 2\) Install [DBeaver](https://dbeaver.io/download), a ui tool for viewing/modifying postgresql databases.

Additional tools: (all optional)
* 1\) [opt] Install the VSCode [Kubernetes extension](https://marketplace.visualstudio.com/items?itemName=ms-kubernetes-tools.vscode-kubernetes-tools), and connect it with your kubeconfig file (eg. `$HOME/.kube/config`).
	* Note: I (Venryx) personally no longer use this extension, due to it performing more background operations (of reading the k8s cluster state) than desired.
	* 1.1\) Also install the [Pod File System Explorer](https://marketplace.visualstudio.com/items?itemName=sandipchitale.kubernetes-file-system-explorer) component, enabling the Kubernetes extension to display the file-tree of running pods, and open their files.
* 2\) [opt] Install the VSCode [Bridge to Kubernetes extension](https://marketplace.visualstudio.com/items?itemName=mindaro.mindaro), for replacing a service in a remote kubernetes cluster with one running locally (for easier/faster debugging).
* 3\) See here for more helpful tools: https://collabnix.github.io/kubetools

</details>

<!----><a name="setup-k8s"></a>
<details><summary><b>[setup-k8s] Setting up local k8s cluster</b></summary>

> There are multiple ways to set up a local Kubernetes cluster. This guide-module **recommends using "Docker Desktop" on Windows/Mac and "docker engine" + "kind" on Linux**, but other approaches should also work (though with possibly sparser documentation in this readme).

#### Options

Options discussed in this module: ([X,X,X] = [linux, mac, windows], [X,X] = [linux, mac/windows])
| Name             | Cluster recreate | Registry delay | VM overhead | Runtime perf |
| -                | -                | -              | -           | -            |
| Docker Desktop   | slow             | 0              | Y           | ~5           |
| Rancher Desktop  | ?                | ?              | Y           | ?            |
| K3d              | very fast        | 0/~3m          | N/Y/Y       | 10           |
| Kind             | fast             | 0/~3m          | N/Y/Y       | 10?          |

Other notes:
* General:
	* The runtime perf numbers are (currently) just very rough estimates based on anecdotal times observed.
* Docker Desktop **(recommended for Windows/Mac)**
	* CON: Docker Desktop seems to have more issues with some networking details; for example, I haven't been able to get the node-exporter to work on it, despite it work alright on k3d (on k3d, you sometimes need to restart tilt, but at least it works on that second try; with Docker Desktop, node-exporters has never been able to work). However, it's worth noting that it's possible it's (at least partly) due to some sort of ordering conflict; I have accidentally had docker-desktop and k3d and kind running at the same time often, so the differences I see may just be reflections of a problematic setup.
* Rancher Desktop: No other notes atm.
* K3d: No other notes atm.
* Kind **(recommended for Linux)**: No other notes atm.

#### Base instructions

* 1\) If on Windows, you'll first need to [install WSL2](https://learn.microsoft.com/en-us/windows/wsl/install). For the simple case, this involves...
	* 1.1\) Run `wsl --install`, restart, wait for WSL2's post-restart installation process to complete, then enter a username and password (which is probably worth recording).
	* 1.2\) It is highly recommended to set memory/cpu limits for the WSL system (as [seen here](https://stackoverflow.com/a/66797264)), otherwise it can (and likely will) consume nearly all of your device's resources.
* 2\) Install the docker solution you selected. (see comparison table above)
	* 2.1\) Option 1: Docker Desktop **(recommended for Windows and Mac)**
		* 2.1.1\) Follow: https://www.docker.com/products/docker-desktop
		* 2.1.2\) Create your Kubernetes cluster, by checking "Enable Kubernetes" in the settings, and pressing apply/restart.
		* Note: To delete and recreate the cluster, use the settings panel.
	* 2.2\) Option 2: Rancher Desktop
		* 2.2.1\) Follow: https://docs.rancherdesktop.io/getting-started/installation
		* 2.2.2\) Create your Kubernetes cluster in Rancher Desktop; this is done automatically during the first launch of Rancher Desktop.
		* Note: To delete and recreate the cluster, use the settings panel.
	* 2.3\) Option 3 or 4: K3d or Kind **(recommended for Linux)**
		* 2.3.1\) First, install docker itself. (aka "docker engine")
			* 2.3.1.1\) If on Windows/Mac, install Docker as a prerequisite -- which on these platforms, is done through installation of Docker Desktop (though without need of creating a k8s cluster through its ui as seen in step 2.1.2): https://www.docker.com/products/docker-desktop
			* 2.3.1.2\) If on Linux, install **docker-engine**, and configure it to rootless mode; note that **docker-engine is not the same as Docker Desktop for Linux**.
				* Note: Docker-engine begins in normal/root mode, but can be switched to operate in "rootless mode". The scripts and instructions in this repo assume a "rootless" setup (for lower security risk and easier usage from scripts), but operating in normal/root mode should also be possible with some script tweaks (the section below assumes we're aiming for rootless mode though).
				* 2.3.1.2.1\) Start by installing docker-engine the normal way (we'll switch it to "rootless mode" shortly): https://docs.docker.com/engine/install
				* 2.3.1.2.2\) Switch docker-engine to rootless mode: https://docs.docker.com/engine/security/rootless
					<details><summary><b>2.3.1.2.2.X) Steps for switching to rootless mode (extracted from page above)</b></summary>

					* Note: The instructions on this level are based on the docs page above; and these summarized instructions assume you're using Ubuntu / Linux Mint. So only follow these simplified steps if not conflicting with the instructions on that page.
					* 1\) Run: `apt install uidmap`
					* 2\) Run: `sudo apt-get install -y dbus-user-session`
						* 2.1\) If this resulted in a new version being installed, log out then back in.
					* 3\) Run: `apt-get install docker-ce-rootless-extras`
					* 4\) Ensure the system-wide Docker daemon is not already running, by running: `sudo systemctl disable --now docker.service docker.socket`
					* 5\) Run `/usr/bin/dockerd-rootless-setuptool.sh install`. If this command succeeds, docker-engine should now be runnable in rootless mode.
					* 6\) If you want docker-engine to be launched in rootless mode immediately, run: `systemctl --user start docker`
					* 7\) To have docker-engine automatically launched in rootless mode at time of login, run:
						```
						systemctl --user enable docker
						sudo loginctl enable-linger $(whoami)
						```
					* 8\) Have the `docker` client/cli-tool default to operating against the rootless daemon (my interpretation of this step anyway), by running: `docker context use rootless`
					</details>
				* 2.3.1.2.3\) If you're using an `ecryptfs` encrypted home directory (eg. as set during Linux Mint install), the regular `~/.local/share/docker` path will not work as the docker root/data dir (the `overlay2` file-system that docker tries to use apparently cannot work on top of an `ecryptfs` file-system, resulting in the cryptic `invalid argument` error on trying to perform docker commands). To fix this, you'll need to tell docker to use a different folder.
					<details><summary><b>2.3.1.2.3.X) Steps for changing docker's root data folder</b></summary>

					* 1\) Create an empty folder somewhere, as the root/data dir for (rootless mode) docker. We'll refer to this as `/NEW_DOCKER_ROOT` from here on, but you can choose whatever path you want (so long as it is **outside of your home folder**). Example command: `sudo mkdir -p /NEW_DOCKER_ROOT`
					* 2\) Change folder's owner to your user: `sudo chown -R $USER /NEW_DOCKER_ROOT`
					* 3\) Change folder's permissions to allow read and write for your user: `chmod -R u+rw /NEW_DOCKER_ROOT`
					* 4\) Create/modify the `~/.config/docker/daemon.json` config file, to have the `data-root` field set to the new data directory you just created. Example contents for the file (can contain other fields/customizations):
						```
						{
							"data-root": "/NEW_DOCKER_ROOT"
						}

						```
					* 5\) To have docker operate with this new data directory, either restart your computer, or run: `systemctl --user daemon-reload && systemctl --user restart docker`
					</details>
				* 2.3.1.2.4\) If you encounter the issue of the user-level `docker` service (added by the rootless-docker install script) inexplicably just failing to be launched at time of user login (ie. a status of `inactive (dead)` after startup, but no errors or other debug information), you can try using the workaround described below. (I needed to use this on my Linux Mint laptop; while unconfirmed, I suspect it ultimately had to do with my having `ecryptfs` encryption enabled for my home directory.)
					<details><summary><b>2.3.1.2.4.X) Steps for fixing user-level docker service not starting</b></summary>

					* 1\) Create a file at `~/.config/autostart/docker-fix.desktop`, with the following contents:
						```
						[Desktop Entry]
						Type=Application
						Name=Docker Fix
						Exec=systemctl --user start docker
						Hidden=false
						NoDisplay=false
						X-GNOME-Autostart-enabled=true
						```
					* The docker service should now be able to auto-start when the computer starts. (the above is admittedly a workaround, but it's been working fine for me so far)
					</details>
		* 2.3.2\) Option 3: K3d (would be the recommended for Linux, except I haven't been able to complete setup when docker is run in rootless mode + the user's home directory uses ecryptfs; so for now, Kind is recommended since I've confirmed it to work)
			* 2.3.2.1\) Follow: https://k3d.io/#installation
			* 2.3.2.2\) Create a local registry: `k3d registry create reg.localhost --port 5000`
			* 2.3.2.3\) Create a local cluster: `k3d cluster create main-1 --registry-use k3d-reg.localhost:5000` (resulting image will be named `k3d-main-1`) [this line currently hangs for me on my linux laptop]
			* 2.3.2.4\) Add an entry to your hosts file, to be able to resolve `reg.localhost`:
				* 2.3.2.4.1\) For Windows: Add line `127.0.0.1 k3d-reg.localhost` to `C:\Windows\System32\Drivers\etc\hosts`.
				* 2.3.2.4.2\) For Linux: Add line `127.0.0.1 k3d-reg.localhost` to `/etc/hosts`. (on some Linux distros, this step isn't actually necessary; eg. on Linux Mint 21.3, this was not necessary)
			* Note: To delete and recreate the cluster: `k3d cluster delete main-1 && k3d cluster create main-1`
		* 2.3.3\) Option 4: Kind **(recommended for Linux)**
			* 2.3.3.1\) Follow: https://kind.sigs.k8s.io/docs/user/quick-start/#installation
			* 2.3.3.2\) Run: `kind create cluster --name main-1`. The resulting image will be named `kind-main-1`.
			* 2.3.3.3\) Your cluster will most likely fail with `too many open files` errors. Follow the guide at https://kind.sigs.k8s.io/docs/user/known-issues/#pod-errors-due-to-too-many-open-files
			* Note: To delete and recreate the cluster: `kind delete cluster --name main-1 && kind create cluster --name main-1`
* 3\) Install kubectl.
	* 3.1\) If you installed Docker Desktop or Rancher Desktop, then `kubectl` was already installed along with it.
	* 3.2\) If you installed K3d or Kind, then you'll need to install `kubectl` yourself: https://kubernetes.io/docs/tasks/tools/#kubectl
		* Note: On Linux, my personal preference is to use snap to install kubectl: `snap install kubectl --classic` (there are other options of course, as seen in link above)
		* Note: In some cases, `kubectl` can end up using a kube config file (eg. `~/.kube/config`) that does not contain the contents used by your k8s system. In my case, it was unable to see the k8s cluster created by K3d on my Linux laptop; this may have been caused by my having installed Rancher Desktop prior to installing K3d. I fixed the problem by running `sudo k3d kubeconfig get --all`, and then manually merging the printed contents to my `~/.kube/config` file.
	* 3.3\) Test if `kubectl` is working properly, by running: `kubectl cluster-info`

#### After steps

* 1\) Various scripts expect the debate-map k8s contexts to be called `dm-local` (or `dm-ovh` for prod cluster). To prevent errors from name mismatches, create an alias/copy of the k8s context you just created, renaming it to `dm-local`:
	* 1.1\) This means:
		* 1.1.1\) Open: `$HOME/.kube/config`
		* 1.1.2\) Find the context entry for the k8s solution you're using. For Docker Desktop, this would look like the following: (the equivalent entries for rancher-desktop, k3d, kind, etc. should be straightforward to discern)
		```
		- context:
		    cluster: docker-desktop
		    user: docker-desktop
		  name: docker-desktop
		```
		* 1.1.3\) Make a new copy of that section (pasted just below it), changing the copy's `name: docker-desktop` (the outer one, if that key is seen twice) to `name: dm-local`, then save.
		* 1.1.4\) [opt] To switch to this new context immediately (not necessary): `kubectl config use-context dm-local` (you can also just modify the `current-context` field in the `~/.kube/config` file)
* 2\) [opt] To make future kubectl commands more convenient, set the context's default namespace: `kubectl config set-context --current --namespace=app`

#### Troubleshooting

* 1\) If on Windows, your dynamic-ports range may start out misconfigured, which will (sometimes) cause conflicts with attempted port-forwards (from your Kubernetes pods to your localhost ports). See [here](https://superuser.com/a/1671710/231129) for the fix. (worth checking ahead of time on Windows, as it wasted considerable time for me)
* 2\) If your namespace gets messed up, delete it using this (regular kill command gets stuck): `npm start "backend.forceKillNS NAMESPACE_TO_KILL"`
	* 2.1\) If that is insufficient, you can either:
		* 2.1.1\) Help the namespace to get deleted, by editing its manifest to no longer have any "finalizers", as [shown here](https://stackoverflow.com/a/52012367).
		* 2.1.2\) Reset the whole Kubernetes cluster. (eg. using the Docker Desktop UI)
* 3\) If the list of images/containers gets annoyingly long, see the [docker-trim](#docker-trim) module.
* 4\) If you had previously installed docker through one approach (eg. rancher desktop), but then want to switch to another (eg. docker engine), this can cause subtle conflicts. It is recommended to fully uninstall the previous installation before installing the new one.

</details>

<!----><a name="setup-psql"></a>
<details><summary><b>[setup-psql] Setting up the psql tool</b></summary>

> Note: While installation of the `psql` tool on your host machine should not strictly be necessary (since there is an instance of it that can be accessed through some postgres-related docker containers), it is best to install it for more ergonomic usage: many of the helper scripts rely on it, and having it on your host machine makes it easier to use certain features, such as execution of .sql files present only on the host machine (eg. for when running the init-db and seed-db scripts).

Steps:
* 1\) First, make a note of which major version of Postgres you need. This should be Postgres v15 (as of 2024-04-27); to confirm a version match, you can run `npm start ssh.db`, then in that shell run `psql --version`.
* 2\) Next, download/install the package containing the `psql` binary.
	* 2.1\) If on Windows:
		* 2.1.1\) Option 1: If you want to install the full Postgres software (eg. letting you run a pg server on your host OS [not needed for debate-map]), download and install from here (keep same major version noted above): https://www.postgresql.org/download
		* 2.1.2\) Option 2: If you want to install just the Postgres binaries needed for `psql` to operate, download and extract the contents from the zip file here (keep same major version noted above): https://www.enterprisedb.com/download-postgresql-binaries
			* 2.1.2.1\) Ensure the `psql` binary is added to your `Path` environment-variable. (I forget if this is automatic)
	* 2.2\) If on Linux (Linux Mint, anyway):
		* 2.2.1\) Run: `sudo apt install postgresql-client-common`
		* 2.2.2\) Run: (based on [this Medium post](https://medium.com/@mglaving/how-to-install-postgresql-15-on-linux-mint-21-27cca7918006))
			```
			# add postgres repo, import the repo signing key, then update the package lists
			sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt jammy-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
			wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
			sudo apt update

			# install the target version of PostgreSQL, client tools only
			# (if you want to enable a pg server on your host OS [not needed], install "postgres-XX" instead)
			sudo apt install postgresql-client-15 -y
			```

</details>

<!----><a name="continuous-profiling"></a>
<details><summary><b>[continuous-profiling] How to set up continuous profiling of the NodeJS pods</b></summary>

We used to use NewRelic to try to do this, but that was cancelled. Tooling to use for this is "to be decided".

</details>





### Tasks (occasional)

<!----><a name="pgo-required-updates"></a>
<details><summary><b>[pgo-required-updates] PGO (crunchydata postgres) required updates</b></summary>

The cluster's database is an instance of the [CrunchyData Postgres Operator, v5](https://access.crunchydata.com/documentation/postgres-operator/v5); we use various docker images that they provide, under the `registry.developers.crunchydata.com/crunchydata/` path. However, they apparently do not keep those images up forever, meaning that at some point, updating to a new version is required (eg. since new devs/environments would then be unable to pull the images themselves).

To update only the "postgres" image/component within the pgo package (this is usually all that's needed):
* 1\) Take a look at the file `Packages/deploy/PGO/install/values.yaml` to see what postgres version-images are available; if there is a new major-version you can jump to (that's not dropped yet), targeting that should solve the issue. (of the postgres image the cluster had been using being dropped from the crunchydata registry)
* 2\) If doable, create a copy of the new postgres-version image in a private-registry (to avoid it being dropped in the future), and use that as the target rather than the url noted above:
	* IMPORTANT NOTE: Using a private-registry mirror of the postgres image is not *yet* fully figured out, because I don't yet know how to provide the authentication data to the production cluster for it to be able to read from the private registry. There is a CrunchyData guide [here](https://access.crunchydata.com/documentation/postgres-operator/5.3.1/guides/private-registries/) which presumably can make this work. But for now, I'll just use the official image -- but now using the postgres v15 image (since that one is not dropped from the crunchydata registry, and should not be dropped for another year or so).
	* 2.1\) Ensure a copy of the target postgres image is stored in your private registry, by pasting the target version's image-url into the `MirrorTransientImages.js` file, then running it: `node ./Scripts/Docker/MirrorTransientImages.js`
	* 2.2\) Now open the `Packages/deploy/PGO/install/values.yaml` file again, and update the `relatedImages.postgres_XX.image` field to match the url of the private-registory mirror of the image. (so it's getting dropped from the main registry does not cause problems for us later)
	* 2.3\) If we're still needing to use the "large postgres images" fix, update the docker-pull command in `Postgres.star` to match the private-registry image-url.
* 3\) Now we need to update the postgres-cluster's data-folder to work with the new version of postgres:
	* 3.1\) Option 1: Run the postgres major-version update process that CrunchyData outlines here (recommended [ideally anyway; it failed last attempt in the production cluster, forcing Option 2]): https://access.crunchydata.com/documentation/postgres-operator/v5/guides/major-postgres-version-upgrade
		* 3.1.1\) Notes for its step 1:
			* It's recommended to at least make a logical backup at this point. (see: [pg-dump](#pg-dump))
		* 3.1.2\) Notes for its step 2:
			* 3.1.2.1\) In the first code-block (the yaml for the `PGUpgrade`), make sure you set:
				* `meta.namespace: postgres-operator` (alternately, you could do this as part of the `kubectl apply` command, but better to have it in the git-tracked file itself imo)
				* `meta.name: <name matching the pattern pg-upgrade-13-to-15>`
			* 3.1.2.2\) The contents of that first code-block should be saved to a file in the `Packages/deploy/PGO/@Operations` folder, with the filename matching the `meta.name` field. (eg. `pg-upgrade-13-to-15.yaml`)
			* 3.1.2.3\) It doesn't say how to deploy the listed yaml to the cluster; you could add it to the tilt scripts, or run `kubectl apply` directly. For the latter, run (from repo root): `kubectl apply -f Packages/deploy/PGO/@Operations/<file name from prior step>` (make sure you have Docker Desktop targeting the correct cluster first, ie. local or remote)
			* 3.1.2.4\) It is now expected that, when viewing/"editing" the newly-added `pg-upgrade-XXX` object in Lens (under the "Custom Resources" category), you'll see the text (near the bottom): `message: PostgresCluster instances still running`
		* 3.1.3\) Notes for its step 3:
			* In our case, the cluster-annotating command to run is: `kubectl -n postgres-operator annotate postgrescluster debate-map postgres-operator.crunchydata.com/allow-upgrade="pg-upgrade-13-to-15"`
			* When it says to shut down the cluster, in our case it means modifying the `Packages/deploy/PGO/postgres/values.yaml` file to have `shutdown: true`, then applying it (ie. by saving the file, with Tilt running; you could also use Lens to change the field directly, which is faster but requires more care with field-placement).
		* 3.1.4\) Notes for its step 4:
			* If you hit an error about the `pg15` (or whatever your target/new-pg-version is) directory already existing, this may be due to a prior (presumably failed) upgrade attempt. To fix this, delete the pg-upgrade object (pod will be dropped with it), comment out the `shutdown: true` line again, wait for the pgo `X-instance1-X` pod to start up again, then SSH into that pod, and delete/rename the given directory; then you can redo the relevant steps to get to step 3.1.4 again.
		* 3.1.5\) Notes for its step 5:
			* Once you've confirmed the upgrade has completed successfully, it's recommended to remove the `PGUpgrade` object (I prefer to do this using Lens, with it shown under the "Custom Resources" category).
		* 3.1.6\) Notes for its step 6:
			* For its vacuumdb command, I went with the first option (`vacuumdb --all --analyze-in-stages`), and ran it in the shell for the `debate-map-instance1-XXX` pod.
			* You could also do cleanup/removal of the old data-folder (eg. `pg13`) by following the given information (in the same `instance1` pod above), but I wouldn't bother unless disk-space is running low. (I don't believe those old folders become part of either the physical or logical automated backups, so the impact is minimal)
	* 3.2\) Option 2: Reset the database storage directory and restore a logical backup of the database.
		* 3.2.1\) Shut down the postgres cluster: modify `Packages/deploy/PGO/postgres/values.yaml` to have `shutdown: true`, or use Lens to apply this change directly. (this step is maybe not necessary, but better safe than sorry for now)
		* 3.2.2\) Change the `postgresVersion` field of `Packages/deploy/PGO/postgres/values.yaml` to the target/new version.
		* 3.2.3\) Reset the database data-folder, as well as the pgbackrest data and repo folders:
			* 3.2.3.1\) Option 1: By nuking the persistent-volume-claims (recommended atm).
				* WARNING: This will destroy your in-cluster copy of the database contents. Only do this if you're sure you have external backups, and you want to fully reset the pgo data/storage.
				* 3.2.3.1.1\) Use Lens to destroy the persistent-volume-claims named `debate-map-instance1-XXXX-pgdata` and `debate-map-repo1`.
				* 3.2.3.1.2\) That's it for now... (proceed to step 3.2.4, then in step 3.2.5, we do an additional step to complete the resetting, followed by the restore of the logical-backup)
			* 3.2.3.2\) Option 2: By modifying the persistent-volume-claims to rename the relevant folders.
				* 3.2.3.2.1\) Rename the folders within `pgdata`:
					* 3.2.3.2.1.1\) We need a way to modify the persistent-volume-claim used by postgres, from a stable pod that will not keep restarting. To do this, deploy the `Packages/deploy/PGO/@Operations/@explore-pvc_debate-map-instance1-XXX-pgdata.yaml` file to the cluster. This will create a `busybox` pod that we can SSH into.
					* 3.2.3.2.1.2\) In the explore-pvc/busybox pod, run `cd /mnt/volume1`, then:
						* 3.2.3.2.1.2.1\) Run: `mv pgXX pgXX_vdisabled1` (do this for all `XX`/versions present, both old and new)
						* 3.2.3.2.1.2.2\) Run: `mv pgXX_wal pgXX_wal_vdisabled1`. (do this for all `XX`/versions present, both old and new)
						* 3.2.3.2.1.2.3\) Run: `mv pgbackrest pgbackrest_vdisabled1`
				* 3.2.3.2.2\) Rename the folders within the pg repo folder (forget exact name, but used by `repo1` pod):
					* Similar steps to the above, except for the `repo1` persistent-volume-claim.
		* 3.2.4\) Start up the postgres cluster again (do the opposite of step 3.2.1). Also, if you haven't already, close and start/restart the tilt-up process.
		* 3.2.5\) You'll also need to get pgo to fully forget about its old repo-data (not sure how it is still accessing it, but this step was found necessary; tbh step 3.2.3 is probably not necessary if this step is done): With tilt running again, press the "Trigger update" button on the `pgo` and `pgo_crd-definition` resources; keep doing this (alternating between them every several seconds, eg. 3+ times), until the log-messages do not show errors, and the pgo resource shows in its logs messages like `trying to bootstrap a new cluster`, `initialized a new cluster`, and finally the "success" message of `INFO: no action. I am (debate-map-instance1-XXXX-0), the leader with the lock`. At this point, it should be a new pgo cluster that no longer tries to restore data from old/now-invalid physical backups.
		* 3.2.6\) Restore the logical-backup, by following the "To restore a backup" section in guide-module: [pg-dump](#pg-dump)

If you are doing an update of the entire postgres-operator package, here are some notes on it:
* We are using the helm-based installation approach rather than kustomize-based one, since this way updates are less complicated/painful.
* The official instructions for an initial install are [here](https://access.crunchydata.com/documentation/postgres-operator/v5/installation/helm).
* To do an update of the postgres-operator:
	* 1\) If the update process will involve a major-version upgrade of postgres, you'll need to decide if you want to reset the cluster then restore a logical-backup, or instead use the CrunchyData cluster-upgrade tool. The latter is recommended if there is a postgres-version that is supported by both the old and new pgo packages. If doing the latter (the cluster-upgrade tool), then the first step is updating just the postgres data-folder, by following the steps in the section above (through path of step 4.1). If doing the former (cluster reset followed by logical-backup), then instead use the path through step 4.2, and do that data-restore *after* the steps below.
	* 2\) Do a fresh clone of the examples repo (referenced in the helm-based install instructions above).
	* 3\) Make a temporary copy (placed somewhere outside dm's git repo) of the files under `Packages/deploy/PGO` that were "customized" from their initial contents. Currently, this means:
		* 3.1\) File: `Packages/deploy/PGO/postgres/values.yaml`
	* 4\) Replace the contents of the `Packages/deploy/PGO` folder with the contents of the `helm` folder, in the examples repo from step 1.
	* 5\) For each non-commented key in your backup of `postgres/values.yaml` (all keys except `postgresVersion` started commented), paste it into the appropriate location in the new `PGO/postgres/values.yaml` file.

</details>

<!----><a name="image-inspect"></a>
<details><summary><b>[image-inspect] Docker image/container inspection</b></summary>

Prerequisite steps: [setup-backend](#setup-backend)

Tools:
* Make a shortcut to `\\wsl$\docker-desktop-data\version-pack-data\community\docker\overlay2`; this is the path you can open in Windows Explorer to view the raw files in the docker-built "layers". (ie. your project's output-files, as seen in the docker builds)
* Install the Docker "dive" tool (helps for inspecting image contents without starting container): https://github.com/wagoodman/dive
* To inspect the full file-contents of an image: `docker save IMAGE_NAME -o ./Temp/output.tar` (followed by extraction, eg. using [7-zip](https://www.7-zip.org))

</details>

<!----><a name="docker-trim"></a>
<details><summary><b>[docker-trim] Docker image/container trimming</b></summary>

Prerequisite steps: [setup-backend](#setup-backend)

* 1\) When the list of images in Docker Desktop gets too long, press "Clean up" in the UI, check "Unused", uncheck non-main-series images, then press "Remove". (run after container-trimming to get more matches)
* 2\) When the list of containers in Docker Desktop gets too long, you can trim them using a Powershell script like the below: (based on: https://stackoverflow.com/a/68702985)
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

</details>

<!----><a name="k8s-ssh"></a>
<details><summary><b>[k8s-ssh] How to ssh into your k8s pods (web-server, app-server, database, etc.)</b></summary>

* For web-server: `npm start ssh.web-server`
* For app-server: `npm start ssh.app-server`
* For database: `npm start ssh.db`
* For others: `kubectl exec -it $(kubectl get pod -o name -n NAMESPACE -l LABEL_NAME=LABEL_VALUE) -- bash`

Note: If you merely want to explore the file-system of a running pod, it's recommended to use the [Kubernetes Pod File System Explorer](https://marketplace.visualstudio.com/items?itemName=sandipchitale.kubernetes-file-system-explorer) VSCode extension, as it's faster and easier. For editing files, see here: https://github.com/sandipchitale/kubernetes-file-system-explorer/issues/4

</details>

<!----><a name="pod-quick-edits"></a>
<details><summary><b>[pod-quick-edits] How to modify code of running pod quickly</b></summary>

> Update 2022-12-24: Quick-syncing is no longer being used atm. (the nodejs backend pods, where it had been useful, were retired)

* 1\) Tilt is set up to quickly synchronize changes in the following folders: .yalc, Temp_Synced, Packages/js-common
* 2\) If you want to quickly synchronize changes to an arbitrary node-module (or other location), do the following:
	* 2.1\) Copy the node-module's folder, and paste it into the `Temp_Synced` folder.
	* 2.2\) Open a shell in the target pod. (see [k8s-ssh](#k8s-ssh))
	* 2.3\) Create a symbolic link, such that the target path now points to that temp-folder: `ln -sf /dm_repo/Temp_Synced/MODULE_NAME /dm_repo/node_modules`
	* 2.4\) To confirm link was created, run: `ls -l /dm_repo/node_modules/MODULE_NAME`
	* Note: These symlinks will be cleared whenever `yarn install` is run again in the pod. (eg. if your app's `package.json` is changed)

</details>





### Tasks (frequent)

<!----><a name="reset-db-local"></a>
<details><summary><b>[reset-db-local] How to init/reset the database in your local k8s cluster</b></summary>

Prerequisite steps: [setup-k8s](#setup-k8s), [setup-psql](#setup-psql)

* 1\) If there already exists a `debate-map` database in your local k8 cluster's postgres instance, "delete" it by running: `npm start "db.demoteDebateMapDB_k8s dm-local"`
	* 1.1\) For safety, this command does not technically delete the database; rather, it renames it to `debate-map-old-XXX` (with `XXX` being the date/time of the rename). You can restore the database by changing its name back to `debate-map`. To find the modified name of the database, run the query: `SELECT datname FROM pg_database WHERE datistemplate = false;` (to connect to the postgres server in order to run this query, run: `npm start "db.psql_k8s dm-local db:postgres"`)
* 2\) Run: `npm start "db.initDB dm-local"` (or manually: connect to postgres server/pod and apply the `./Scripts/InitDB/@CreateDB.sql` and `./Scripts/InitDB/@InitDB.sql` scripts)
* 3\) Run: `npm start "db.seedDB dm-local"` (or manually: connect to postgres server/pod and apply the `./Scripts/SeedDB/@SeedDB.sql` script)
	* 3.1\) If you get an error, changes may have been made to the expected database structure, with it being forgotten to update the `GenerateSeedDB.ts` code (or to regenerate its `@SeedDB.sql` output script). Open the `Scripts\SeedDBGenerator\GenerateSeedDB.ts` file, check for TypeScript errors, fix any you see, then run `npm start "db.seedDB_freshScript dm-local"`.

</details>

<!----><a name="run-backend-local"></a>
<details><summary><b>[run-backend-local] How to run backend codebase, for local development</b></summary>

Prerequisite steps: [setup-k8s](#setup-k8s)

* 1\) If this is the first run, or if changes were made to the `client` or `monitor-client` web/frontend codebases, run the relevant js-building and js-bundling script(s):
	* 1.1\) `npm start client.tsc_noWatch && npm start client.build.prodQuick` (can skip tsc part if client's tsc is already running)
	* 1.2\) `npm start monitorClient.tsc_noWatch && npm start monitorClient.build.prodQuick` (can skip tsc part if monitor-client's tsc is already running)
* 2\) Launch the backend pods necessary for the behavior you want to test:
	* 2.1\) Option 1, by launching the entire backend in your local k8s cluster: **(recommended)**
		* 2.1.1\) If your docker/kubernetes system is not active yet, start it now. (eg. on Windows, launching Docker Desktop from the start menu)
		* 2.1.2\) Run (in repo root): `npm start backend.tiltUp_local`
		* 2.1.3\) Wait till Tilt has finished deploying everything to your local k8s cluster. (to monitor, press space to open the Tilt web-ui, or `s` for an in-terminal display)
			* 2.1.3.1\) If you hit the error `Error: couldn't find key host in Secret default/debate-map-pguser-...`, kill the tilt-up process, then rerun it. (this will allow tilt / `Reflector.star` to generate a new annotation on the `default/debate-map-pguser-admin` resource, triggering it to reflect the now-populated secret in the `postgres` namespace)
	* 2.2\) Option 2, by launching individual pods/components directly on your host machine: (arguably simpler, but not recommended long-term due to lower reliability for dependencies, eg. platform-specific build hazards and versioning issues)
		* 2.2.1\) Start serving of frontend. (if not already)
			* 2.2.1.1\) Run web-server directly: `cd Packages/web-server; cargo run` (not yet tested)
			* 2.2.2.2\) Serve frontend files using rspack, as described in the [run-frontend-local](#run-frontend-local) module.
		* 2.2.2\) Start app server:
			* NOTE: To connect to this app-server process from the frontend, you'll need to add a `appServerPort=5110` query-param to the url.
				* Limitation: Currently, the app-server cannot access the k8s service-account token, thus `get_k8s_certs()` fails, thus `get_or_create_k8s_secret()` fails, thus `get_or_create_jwt_key_hs256()` fails, thus actions which require that the user be signed-in fail (due to the app-server being unable to validate the JWT tokens that are provided).
			* 2.2.2.1\) Option 1, run locally by using the command `npm start app_server.run` which sets the required env variables and runs cargo run.
			* 2.2.2.2\) Option 2, run with the debugger using vscode:
				* 2.2.2.2.1\) The CodeLLDB extension for vscode must be installed.
				* 2.2.2.2.2\) Generate the necessary `.env.local` file by running `npm start db.local_secrets`.
				* 2.2.2.2.3\) Run the debugger by going to the debugging side-panel, selecting "Debug App Server", then pressing to the play/start-debugging button.
				* NOTE: Pressing "Stop" in the debugger controls *does not always* succeed in killing the app-server process, which can cause later launches to fail (due to the port being in use). If you hit this issue, you can kill the zombie processes manually. (eg. using task-manager)
					* On Windows, you can run in the terminal: `taskkill /IM "app_server.exe" /F`
	* Note: If changes were made that require changes to the db schema, you may hit errors on app-server startup. To resolve this, you can either reset your local database (see: [#reset-db-local](#reset-db-local)), or write/run a database migration (see: [#db-migrate](#db-migrate)).
* 3\) Backend should now be up and running. You can test the deployment by opening the main web frontend (eg. `localhost:[5100/5101]`), or interacting with one of the pages served by another pod (eg. the graphql playground page at `localhost:5100/app-server/gql-playground`).

> For additional notes on using Tilt, see here: [tilt-notes](#tilt-notes)

</details>





### Miscellaneous

## For backend deployers/maintainers

### Tasks (one-time, or very rare)

<!----><a name="cloud-project-init"></a>
<details><summary><b>[cloud-project-init] Cloud-projects initialization (eg. creating Google Cloud project for Pulumi to work within)</b></summary>

Note: We use Google Cloud here, but others could be used.

* 1\) Ensure you have a user-account on Google Cloud Platform: https://cloud.google.com/
* 2\) Install the Google Cloud SDK: https://cloud.google.com/sdk/docs/install
* 3\) Authenticate the gcloud sdk/cli by providing it with the key-file for a service-account with access to the project you want to deploy to.
	* 3.1\) For the main Google Cloud project instance, you'll need to be supplied with the service-account key-file. (contact Venryx)
	* 3.2\) If you're creating your own fork/deployment, you'll need to:
		* 3.2.1\) Create a GCP project.
		* 3.2.2\) Enable the Artifact Registry API for your GCP project: https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com
		* 3.2.3\) Create a service-account: (it's possible a user account could also be granted access directly, but service-accounts are recommended anyway)
			* 3.2.3.1\) Go to: https://console.cloud.google.com/iam-admin/serviceaccounts/create
			* 3.2.3.2\) Choose a service-account name (eg. "service-account-1"), and add the role "Artifact Registry Administrator" and "Storage Admin" (*not* the weaker "Storage Object Admin").
			* 3.2.3.3\) In the "Service account admins role" box, enter your email.
			* 3.2.3.4\) In the "Service account users role" box, enter your email, and the email of anyone else you want to have access.
			* 3.2.3.5\) Create a key for your service account, and download it as a JSON file (using the "Keys" tab): https://console.cloud.google.com/iam-admin/serviceaccounts
	* 3.3\) Move (or copy) the JSON file to the following path: `Others/Secrets/gcs-key.json` (if there is an empty file here already, it's fine to overwrite it, as this would just be the placeholder you created in the [setup-k8s](#setup-k8s) module)
	* 3.4\) Add the service-account to your gcloud-cli authentication, by passing it the service-account key-file (obtained from step 3.1 or 3.2.3.5): `gcloud auth activate-service-account FULL_SERVICE_ACCOUNT_NAME_AS_EMAIL --key-file=Others/Secrets/gcs-key.json`
	* 3.5\) Add the service-account to your Docker authentication, in a similar way:
		* 3.5.1\) If on Windows, run: `Get-Content Others/Secrets/gcs-key.json | & docker login -u _json_key --password-stdin https://GEOGRAPHICAL_LOCATION_IN_GCP-docker.pkg.dev` (if you're using a specific subdomain of GCR, eg. us.gcr.io or eu.gcr.io, fix the domain part in this command)
		* 3.5.2\) If on Linux/Mac, run: `cat Others/Secrets/gcs-key.json | docker login -u _json_key --password-stdin https://GEOGRAPHICAL_LOCATION_IN_GCP-docker.pkg.dev`


</details>

<!----><a name="pulumi-init"></a>
<details><summary><b>[pulumi-init] Pulumi initialization (provisioning GCS bucket, container registry, etc.)</b></summary>

Prerequisite steps: [cloud-project-init](#cloud-project-init)

Note: We use Google Cloud here, but others could be used.

* 1\) Install the Pulumi cli: `https://www.pulumi.com/docs/get-started/install`
* 2\) Ensure that a Pulumi project is set up, to hold the Pulumi deployment "stack".
	* 2.1\) Collaborators on the main release can contact Stephen (aka Venryx) to be added as project members (you can view it online [here](https://app.pulumi.com/Venryx/debate-map) if you have access).
	* 2.2\) If you're creating your own fork/deployment:
		* 2.2.1\) Create a new Pulumi project [here](https://app.pulumi.com). Make sure your project is named `debate-map`, so that it matches the name in `Pulumi.yaml`.
* 3\) Run: `npm start pulumiUp` (`pulumi up` also works, *if* the last result of `npm start backend.dockerPrep` is up-to-date)
* 4\) Select the stack you want to deploy to. (for now, we always deploy to `prod`)
* 5\) Review the changes it prepared, then proceed with "yes".
* 6\) After a bit, the provisioning/updating process should complete. There should now be a GCS bucket, container registry, etc. provisioned, within the Google Cloud project whose service-account was associated with Pulumi earlier.
* 7\) If the deploy went successfully, a `PulumiOutput_Public.json` file should be created in the repo root. This contains the url for your image registry, storage bucket, etc. The Tiltfile will insert these values into the Kubernetes YAML files in various places; to locate each of these insert points, you can search for the `TILT_PLACEHOLDER:` prefix.

</details>

<!----><a name="ovh-init"></a>
<details><summary><b>[ovh-init] OVH initialization (provisioning remote kubernetes cluster)</b></summary>

Note: We use OVHCloud's Public Cloud servers here, but others could be used.

* 1\) Create a Public Cloud project on OVH cloud. (in the US, us.ovhcloud.com is recommended for their in-country servers)
* 2\) Follow the instructions here to setup a Kubernetes cluster: https://youtu.be/vZOj59Oer7U?t=586  
	* 2.1\) In the "node pool" step, select "1". (Debate Map does not currently need more than one node)  
	* 2.2\) In the "node type" step, select an option. (cheapest is Discovery d2-4 at ~$12/mo, but I use d2-8 at ~$22/mo to avoid occasional OOM issues)
* 3\) Run the commands needed to integrate the kubeconfig file into your local kube config.
* 4\) Create an alias/copy of the "kubernetes-admin@Main_1" k8s context, renaming it to "dm-ovh". (open `$HOME/.kube/config`, copy the aforementioned context section, then change the copy's name to `dm-ovh`)
* 5\) Add your Docker authentication data to your OVH Kubernetes cluster.
	* 5.1\) Ensure that your credentials are loaded, in plain text, in your docker `config.json` file. By default, Docker Desktop does not do this! So most likely, you will need to:
		* 5.1.1\) Disable the credential-helper, by opening `$HOME/.docker/config.json`, and setting the `credsStore` field to **an empty string** (ie. `""`).
		* 5.1.2\) Log in to your image registry again. (ie. rerun step 3.5 of [cloud-project-init](#cloud-project-init))
		* 5.1.3\) Submit the credentials to OVH: `kubectl --context dm-ovh create secret --namespace app generic registry-credentials --from-file=.dockerconfigjson=PATH_TO_DOCKER_CONFIG --type=kubernetes.io/dockerconfigjson` (the default path to the docker-config is `$HOME/.docker/config.json`, eg. `C:/Users/YOUR_USERNAME/.docker/config.json`)
	* 5.1\) You can verify that the credential-data was uploaded properly, using: `kubectl --context dm-ovh get --namespace default -o json secret registry-credentials` (currently we are pushing the secret to the `default` namespace, as that's where the `web-server` and `app-server` pods currently are; if these pods are moved to another namespace, adjust this line accordingly)

</details>

<!----><a name="dns-setup"></a>
<details><summary><b>[dns-setup] How to set up DNS and CDN (if creating own fork/deployment)</b></summary>

Note: We use Cloudflare here, but others could be used.

* 1\) If not done already, update the domain-names in the code and k8s YAML files (eg. `dmvx-ingress.yaml`) to point to your chosen domain-names.
* 2\) Create a Cloudflare account, and start the add-website process on it. Follow the instructions for basic setup (using the defaults, unless otherwise specified).
	* 2.1\) On your domain registrar manager/website, make sure that you configure Cloudflare as the DNS Name Servers.
	* 2.2\) On Cloudflare, make-so it has the following dns-records set:
		* 2.2.1\) `{type: "CNAME", target: "<ovh kubernetes cluster host-name>", name: "*"}`
		* 2.2.2\) `{type: "CNAME", target: "<ovh kubernetes cluster host-name>", name: "<your domain name, eg. debatemap.app>"}`
	* Note: This should be set by default, but if not, enable the "SSL/TLS" -> "Edge Certificates" -> "Always Use HTTPS" option. (seems to not really be necessary, presumably because Traefik doesn't respond for non-https requests so Chrome retries with https automatically, but good practice)
* 3\) Set up a redirect from `www.YOUR_DOMAIN.YOUR_TLD` to `YOUR_DOMAIN.YOUR_TLD`. (using the Rules section, as [seen here](https://community.cloudflare.com/t/redirecting-www-to-non-www/2949/28))

</details>

<!----><a name="oauth-setup"></a>
<details><summary><b>[oauth-setup] How to set up oauth</b></summary>

In order to use the oauth options for sign-in (eg. Google Sign-in), the frontend either must be running on `localhost:[5100/5101]`, or you have to create your own online "application" configs/entries on each of the oauth-providers' platforms. The below instructions are for creating those "application" configs/entries. (replace the domains with your own, of course)

Google Sign-in:
* 1\) Create a Google Cloud project for your fork.
* 2\) Go to: https://console.cloud.google.com/apis/credentials?project=YOUR_PROJECT_NAME
* 3\) In the "Credentials->OAuth 2.0 Client IDs" section, create a new "Web Application" entry.
* 4\) Set the values below: (yes, the plain `localhost` one is [also needed](https://stackoverflow.com/a/68469319)) [replacing CLUSTER_IP_IN_CLOUD with the URL of your cloud-based Kubernetes cluster, if you want direct access to be possible]
```
Authorized JavaScript Origins:
* http://localhost
* http://localhost:5100
* http://[::1]:5100
* http://localhost:5101
* http://[::1]:5101
* https://CLUSTER_IP_IN_CLOUD
* https://debatemap.app
* https://debates.app
* https://debatemap.societylibrary.org

Authorized redirect URIs:
* http://localhost:5100/app-server/auth/google/callback
* http://[::1]:5100/app-server/auth/google/callback
* https://CLUSTER_IP_IN_CLOUD/app-server/auth/google/callback
* https://debatemap.app/app-server/auth/google/callback
* https://debates.app/app-server/auth/google/callback
* https://debatemap.societylibrary.org/app-server/auth/google/callback
* https://debatemap.app/app-server/auth/google/callback_returnToLocalhost
```
<!-- The list above is somewhat "inconsistent" between domains/callback-types. Should decide on what pattern to use. -->

</details>





### Tasks (occasional)

<!----><a name="k8s-monitors"></a>
<details><summary><b>[k8s-monitors] Various commands/info on monitoring system (prometheus, etc.)</b></summary>

* To open a bash shell in the main prometheus pod: `kubectl exec -it prometheus-k8s-[0/1] -n monitoring -- sh` (or just use Lens)
* To view the Grafana monitor webpage, open: `localhost:[3405/4405]` (`3405` for local, `4405` for remote, if using Tilt; if not, manually launch using Lens)
	> The page will ask for username and password. On first launch, this will be `admin` and `admin`.
	>
	> The Grafana instance has been preconfigured with some useful dashboards, which can be accessed through: Dashboards (in sidebar) -> Manage -> Default -> [dashboard name]. You can import additional plugins/dashboards from the Grafana [plugin library](https://grafana.com/grafana/plugins) and [dashboard library](https://grafana.com/grafana/dashboards).
<!-- * To view the Prometheus monitor webpage, open (not currently working): `localhost:31002` -->
* To view the Prometheus monitor webpage, open the k8s cluster in Lens, find the `prometheus` service, then click it's "Connection->Ports" link.
	> The page will ask for username and password. On first launch, this will be `admin` and `admin`.
<!-- * To view the cAdvisor monitor webpage, open (not currently working): `localhost:31001` -->
* To view the cAdvisor monitor webpage [not currently working/enabled], open the k8s cluster in Lens, find the `cadvisor` service, then click it's "Connection->Ports" link.
* To view cpu and memory usage for pods using k8s directly (no external tools), run: `kubectl top pods --all-namespaces` (for additional commands, see [here](https://raaviblog.com/how-to-find-the-current-cpu-and-memory-usage-of-all-the-pods-in-kubernetes-cluster))

</details>

<!----><a name="port-forwarding"></a>
<details><summary><b>[port-forwarding] How to set up port-forwarding for your k8s db, etc.</b></summary>

For database pod:
* 1\) If you have tilt running, a port-forward should already be set up, on the correct port. (`5120` for your local cluster, and `5220` for your remote cluster)
* 2\) You can also set up the port-forwarding by running the script (has vsc-2 tasks): `npm start backend.forward_[local/remote]` (to only port-forward the db pod, add arg: `onlyDB`)

</details>

<!----><a name="k8s-psql"></a>
<details><summary><b>[k8s-psql] How to connect to postgres in your kubernetes cluster, using psql</b></summary>

Approach 1: (by ssh'ing directly in the k8s pod)
* 1\) Run: `npm start "ssh.db [dm-local/dm-ovh]"`
* 2\) Run (in vm shell that opens): `psql`
* 3\) The shell should now have you logged in as the `postgres` user.

Approach 2: (by using external psql with port-forwarding; requires that PostgreSQL be installed on your host computer)
* 1\) Set up a port-forward from `localhost:[5120/5220]` to your k8s database pod. (see: [port-forwarding](#port-forwarding))
* 2\) Run: `npm start "db.psql_k8s [dm-local/dm-ovh]"`
* 3\) The shell should now have you logged in as the `admin` user.

Approach 3: (by using dbeaver)
* 1\) Set up a port-forward from `localhost:[5120/5220]` to your k8s database pod. (see: [port-forwarding](#port-forwarding))
* 2\) Retrieve the data from "debate-map-pguser-admin" for the "dm-local" context by running `npm start db.local_secrets`
* 3\) Enter the data printed in the console to make a new dbeaver connection.


</details>

<!----><a name="k8s-view-pg-config"></a>
<details><summary><b>[k8s-view-pg-config] How to view various postgres config files in the kubernetes cluster</b></summary>

To view the pg config files `postgresql.conf`, `pg_hba.conf`, etc.:
* 1\) Run: `kubectl exec -it $(kubectl get pod -n postgres-operator -o name -l postgres-operator.crunchydata.com/cluster=debate-map,postgres-operator.crunchydata.com/role=master) -- bash`
* 2\) Run (in new bash): `cat /pgdata/pg13/XXX`

</details>

<!----><a name="db-migrate"></a>
<details><summary><b>[db-migrate] Database migrations</b></summary>

Old overview: <https://github.com/Venryx/web-vcore/tree/master/Docs/DatabaseMigrations.md>

##### Note: This module is outdated; database migrations are currently done manually. You can check the [Migration notes](https://github.com/debate-map/app/tree/main/Docs/MigrationNotes.md) doc for the log of structural changes, along with (generally) the db queries required to align with those changes.

New steps:
* 1\) Write a KnexJS script that modifies the db contents to match the new desired shape. (using native PG commands, for fast execution)
	* 1.1\) Make a copy of the latest migration in `Knex/Migrations`, and give it an appropriate name.
	* 1.2\) Write the migration code. (reference the older migration scripts to see patterns used)
* 2\) Enable a flag on the main `debate-map` database, which makes it read-only, and displays an explanation message to users.
	* 2.1\) Using DBeaver, create/modify the single row in the `globalData` table, setting `extras.dbReadOnly` to `true`.
	* 2.2\) If you want to customize the message that is shown to the users, set/modify the `extras.dbReadOnly_message` field. (default: `Maintenance.`)
* 3\) Create a copy of the database, named `debate-map-draft`.
	* 3.1\) Run: `TODO`
* 4\) Execute the migration script against the draft copy of the database.
	* 4.1\) Run: `TODO`
* 5\) Confirm that the draft database's contents are correct.
	* 5.1\) Open the (locally-served) new frontend's code, connecting to the draft database (by adding the `?db=prod-draft` flag to the url -- not yet implemented), and confirm that things work correctly.
	* 5.2\) You could also connect to the draft database using a tool like DBeaver, and confirm that the contents look correct there.
* 6\) Demote the main `debate-map` database. (ie. renaming it to `debate-map-old-XXX`)
	* 6.1\) Run: `npm start "db.demoteDebateMapDB_k8s dm-ovh"`
* 7\) Promote the draft `debate-map-draft` database. (ie. renaming it to `debate-map`)
	* 7.1\) Run: `npm start "db.promoteDebateMapDraftDB_k8s dm-ovh"` [not yet implemented]
* 8\) Disable the `dbReadOnly` flag in the `globalData` table. (see step 2)

</details>





### Tasks (frequent)

<!----><a name="k8s-remote"></a>
<details><summary><b>[k8s-remote] How to deploy web+app server packages to remote server, using docker + kubernetes</b></summary>

Prerequisite steps: [pulumi-init](#pulumi-init), [ovh-init](#ovh-init)

* 1\) If this is the first run, or if changes were made to the `client` or `monitor-client` web/frontend codebases, run the relevant js-building and js-bundling script(s):
	* 1.1\) `npm start client.tsc_noWatch && npm start client.build.prodQuick` (can skip tsc part if client's tsc is already running)
	* 1.2\) `npm start monitorClient.tsc_noWatch && npm start monitorClient.build.prodQuick` (can skip tsc part if monitor-client's tsc is already running)
* 2\) Run: `npm start backend.tiltUp_ovh`
* 3\) Wait till Tilt has finished deploying everything to your local k8s cluster. (to monitor, press space to open the Tilt web-ui, or `s` for an in-terminal display)
* 4\) Verify that the deployment was successful, by visiting the web-server: `http://CLUSTER_URL:5200`. (replace `CLUSTER_URL` with the url listed in the OVH control panel)
* 5\) If you haven't yet, initialize the DB, by following the steps in [reset-db-local](#reset-db-local) -- except replacing the `dm-local` context listed in the commands with `dm-ovh`.
* 6\) You should now be able to sign in, on the web-server page above. The first user that signs in is assumed to be one of the owner/developer, and thus granted admin permissions.

> For additional notes on using Tilt, see here: [tilt-notes](#tilt-notes)

</details>

<!----><a name="k8s-troubleshooting"></a>
<details><summary><b>[k8s-troubleshooting] How to resolve various k8s-related issues</b></summary>

* 1\) In some cases, when pushing a new pod version to your k8s cluster, the pod will fail to be added, with the message `0/1 nodes are available: 1 node(s) had taint {node.kubernetes.io/memory-pressure: }, that the pod didn't tolerate.`
	* 1.1\) You can manually remove the taint by running (as seen [here](https://stackoverflow.com/a/63471551/2452165)): `kubectl taint node <nodename> node.kubernetes.io/memory-pressure:NoSchedule-`
		1.1.1\) Update: This didn't actually seem to work for me. Perhaps k8s is instantly re-applying the taint, since it's based on a persistent memory shortage? Anyway, currently I just wait for the memory shortage to resolve (somehow).
		1.1.2\) For now, another workaround that *seems* to help (from a couple tries), is opening pod-list in Lens, searching for all pods of the given type, selecting-all, then removing/killing all.
		1.1.3\) Another partial workaround seems to be to use Lens->Deployment, set Scale to 0, wait till entry updates, then set Scale to 1 again; in a couple cases this seemed to resolve the taint issue (maybe just coincidence though). 
* 2\) If you get the error "Unable to attach or mount volumes: unmounted volumes [...]" (in my case, after replacing a 4gb node-pool with an 8gb one), the issue may be that the stale persistent-volume-claims requested by the old nodes are still sticking around, causing new claims for the new node to not get created (issue [described here](https://veducate.co.uk/kubelet-unable-attach-volumes/)). To fix this:
	* 2.1\) Run `npm start backend.tiltDown_ovh`.
	* 2.2\) Tilt-down appears to not delete everything, so complete the job by using Tilt to manually delete anything added by our project: basically everything except what's in the `kube-node-lease`, `kube-public`, and `kube-system` namespaces.
		* 2.2.1\) Regular deletion (eg. through the Lens UI) works fine for the following found leftovers: stateful sets, config maps, secrets, and services.
		* 2.2.2\) For leftover namespaces: this deadlocks for me, seemingly due to the postgres-operator CRD having a deadlock occuring during its "finalizer", as [described here](https://stackoverflow.com/a/52012367) (causing its `postgres-operator` namespace to stick around in a bad "terminating" state). See [here](https://stackoverflow.com/a/52377328) to confirm what resources underneath that namespace are causing it to stick around, and then follow the steps below (assuming it's the CRD and/or PV/PVCs) to remove them, then the deadlocked namespace deletion task itself should complete. 
		* 2.2.3\) For the postgres-operator CRD, edit the manifest (eg. using the Lens UI's "Edit" option) to have its "finalizers" commented out, then delete like normal.
		* 2.2.4\) For the persistent-volumes and persistent-volume-claims, due the same thing: comment out its "finalizers", then delete like normal.
	* 2.3\) Rerun the tilt-up script.
	* 2.4\) EDIT: After doing the above, the issue still remains :(. Based on my reading, the above "should" fix it, but it hasn't. For now, I'm resolving this issue by just completely resetting the cluster. (with "Computing nodes" option set to "Keep and reinstall nodes" -- the "Delete nodes" option appears to not be necessary)

</details>

<!----><a name="pg-dump"></a>
<details><summary><b>[pg-dump] Basic backups using pg_dump (type: logical, focus: local-storage)</b></summary>

To create a backup:
* 1\) Option 1, using `GQLBackupHelper.js` script: (recommended)
	* 1.1\) Run: `node ./Scripts/DBBackups/GQLBackupHelper.js backup`
	* 1.2\) A backup dump will be created at: `../Others/@Backups/DBDumps_[local/ovh]/XXX.sql`
* 2\) Option 2, using basic script:
	* 2.1\) Run: `npm start backend.makeDBDump` (has vsc-2 tasks)
	* 2.2\) A backup dump will be created at: `../Others/@Backups/DBDumps_[local/ovh]/XXX.sql`
* 3\) Option 3, using DBeaver:
	* 3.1\) Right-click DB in list. (this assumes you already are connected)
	* 3.2\) Press Tools->Backup, select "app", press Next, set format to "Tar" (optional?), and press Start.
	* Note: If it errors, saying "aborting because of server version mismatch", then update your local postgres to match, OR use option 4.
* 4\) Option 4, using pgdump binaries:
	* 4.1\) Download pgclient binaries for major version on server (eg. as seen in DBeaver error in option 3).
		* 4.1.1\) For Windows: https://www.enterprisedb.com/download-postgresql-binaries
	* 4.2\) Ensure k8s proxy to the database pod is active. (`npm start backend.[forward/tiltUp]_local`)
	* 4.3\) Run the following (as matching DBeaver): `./pg_dump.exe --verbose --host=localhost --port=5220 --username=admin --format=p --file PATH_TO_BACKUP_FILE.sql -n "app" debate-map`
		* 4.3.1\) You'll also need to provide the password for the `admin` user: https://stackoverflow.com/questions/6405127/how-do-i-specify-a-password-to-psql-non-interactively
			* 4.3.1.1\) On Windows: `$env:PGPASSWORD="my_password"; ...put rest of command above here...`

To restore a backup:
* 1\) If the `debate-map` database doesn't exist yet, create it:
	* 1.1\) Start psql: `npm start "db.psql_k8s dm-[local/ovh] db:postgres"`
	* 1.2\) Run the `@CreateDB.sql` script: `\i ./Scripts/InitDB/@CreateDB.sql`
	* 1.3\) Close this terminal/session. (you will not need to connect to this "postgres" database anymore)
* 2\) If the `app` schema already exists, delete or rename it (eg. to `app_old`).
	* 2.1\) Start psql: `npm start "db.psql_k8s dm-[local/ovh]"`
	* 2.2\) Rename or delete it:
		* 2.2.1\) Option 1: Rename it: `ALTER SCHEMA app RENAME TO app_old;`
		* 2.2.2\) Option 2: Delete it: `DROP SCHEMA IF EXISTS app CASCADE;`
* 3\) Do some cleanup of the backup file: (`pgdump` is not perfect, and can output some lines that fail to restore as-is)
	* 3.1\) For cleaner restores, add a `BEGIN;` line at very start, and an `END;` line at very end. (runs restore in a transaction, so if a failure happens, you can edit and retry without conditions changing)
		* Note: While this step is recommended, in some cases you may need to omit this, if the pgdump is such that you need to "re-attempt" applying of it 2+ times in order for eg. dependency conflicts to be resolved. Usually the constraint-deferring line below will be enough though.
	* 3.2\) Some foreign-key constraints may cause ordering conflicts normally. Avoid this by adding a `SET CONSTRAINTS ALL DEFERRED;` line just after the `BEGIN;` line.
	* 3.3\) Copy-paste the contents of `General_Start.sql` into the psql shell, right after the `SET CONSTRAINTS ALL DEFERRED;` line. (adding space padding around inserted section is fine)
		* 3.3.1\) Omit all of the lines in the "search/text-match config" section. (which includes all the lines containing `TEXT SEARCH`)
	* 3.4\) Comment out the line from the original pgdump text that creates the `app` schema, because the code from `General_Start.sql` already does this. 
	* 3.5\) If present, comment out the following line near the end of the file (`pg_stat_statements` table may not be created/populated yet): `GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE app.pg_stat_statements TO rls_obeyer;`
	* 3.6\) The pgdump sql file probably contains a line of `SELECT pg_catalog.set_config('search_path', '', false);`; comment it out (by adding to start of line): `-- `
		* Note: Why is this necessary? Because SQL dumps/backups do not record the "search-path" of the database. This is by design apparently (https://postgrespro.com/list/thread-id/2448092), but means that the search-path must be set manually, if restoring to a fresh database.
* 4\) Execute the SQL dump/backup-file using psql or DBeaver.
	* 4.1\) Option 1: Using psql:
		* 4.1.1\) Start psql: `npm start "db.psql_k8s dm-[local/ovh]"`
			* NOTE: This command is NOT the same as the one above, since this connects to the (new) "debate-map" database instead of the "postgres" one. (so don't just re-use your existing terminal)
		* 4.1.2\) Import the pgdump file: `\i PATH_TO_BACKUP_FILE.sql` (eg. `\i ../Others/@Backups/DBDumps_local/XXX.sql`)
	* 4.2\) Option 2: Using DBeaver:
		* 4.2.1\) After connecting to the debate-map database, right-click it and press Tools->"Execute script", then supply the path to the backup file.
* 5\) Trigger the `c_accessPolicyTargets` cells to be recalculated: (since the data needed to calculate them may not have been fully available while the import was initially happening)
	* 5.1\) Execute SQL: `SELECT app.recalculate_all_access_policy_targets();`
	* 5.2\) For space cleanup, execute SQL: `VACUUM FULL`

> Note: During the import, if you hit an error similar to `ERROR:  duplicate key value violates unique constraint "pg_ts_config_map_index"`, it likely means there's two copies of the dictionary-related creation/update commands. Find the less elegant one and remove it. (shouldn't be needed for newer pgdumps, I think)

</details>

<!----><a name="pgbackrest"></a>
<details><summary><b>[pgbackrest] Rich backups using pgBackRest (type: physical, focus: remote-storage)</b></summary>

General notes:
* Automatic backups are already set up, writing to the `debate-map-prod-uniform-private` bucket provisioned by Pulumi in the Google Cloud, at the path: `/db-backups-pgbackrest`.
* Schedule: Once a week, a "full" backup is created; once a day, a "differential" backup is created.

Backup structure:
* Backups in pgbackrest are split into two parts: base-backups (the `db-backups-pgbackrest/backup` cloud-folder), and wal-archives (the `db-backups-pgbackrest/archive` cloud-folder).
	* Base-backups are complete physical copies of the database, as seen during the given generation period. (well, complete copies if of type `full`; `differential` backups rely on the last `full` backup to be complete, and `incremental` backups rely on the last `full` backup, the last `differential` (if any), along with the in-between series of `incremental` backups)
	* Wal-archives are small files that are frequently being created, which is basically a streaming "changelog" of database updates. Wal-archives allow you to do point-in-time restores to arbitrary times, by augmenting the base-backups with the detailed sequence of changes since them.

Actions:
* To view the list of backups in the Google Cloud UI, run: `npm start backend.viewDBBackups`

To manually trigger the creation of a full backup:
* 1\) Run: `npm start backend.makeDBBackup`
* 2\) Confirm that the backup was created by viewing the list of backups. (using `npm start backend.viewDBBackups`)
	* 2.1\) If the backup failed (which is problematic because it seems to block subsequent backup attempts), you can:
		* 2.1.1\) Trigger a retry by running `npm start backend.makeDBBackup_retry` PGO will then notice the unfinished job is missing and recreate it, which should hopefully work this time.
		* 2.1.2\) Or cancel the manual backup by running: `npm start backend.makeDBBackup_cancel`

</details>

<!----><a name="pgbackrest-restore"></a>
<details><summary><b>[pgbackrest-restore] Restoring from pgBackRest backups</b></summary>

* 1\) Find the point in time that you want to restore the database to. Viewing the list of base-backups in the Google Cloud UI (using `npm start backend.viewDBBackups`) can help with this, as a reference point (eg. if you made a backup just before a set of changes you now want to revert).
* 2\) Prepare the postgres-operator to restore the backup, into either a new or the current postgres instance/pod-set:
	* 2.1\) Option 1, into a new postgres instance/pod-set that then gets promoted to master (PGO recommended way):
		* 2.1.1\) Ensure that the tilt-up script is running for the target context. (and disable any tilt-up scripts running for other contexts)
		* 2.1.2\) Uncomment the `dataSource` field in `postgres.yaml`, uncomment + fill-in the section matching the restore-type you want (then save the file):
			* 2.1.2.1\) If you want to restore exactly to a base-backup (without any wal-archive replaying), use the first section. (modifying "set" to the base-backup folder-name seen in the cloud-bucket)
				* 2.1.2.1.1\) At the moment, you also have to run a `psql` command to complete the restore. See [here](https://github.com/CrunchyData/postgres-operator/issues/1886#issuecomment-907784977).
			* 2.1.2.2\) If you want to restore to a specific point-in-time (with wal-archive replaying), use the second section. (modifying "target" to the time you want to restore to, with a specified timezone [UTC recommended])
	* 2.2\) Option 2, into the existing postgres instance/pod-set (imperative, arguably cleaner way -- but not yet working/reliable):
		* 2.2.1\) Run: `npm start "backend.restoreDBBackup_prep BACKUP_LABEL"` This script patches the postgres-operator deployment/configuration to contain [the fields](https://access.crunchydata.com/documentation/postgres-operator/5.0.2/tutorial/disaster-recovery/#perform-an-in-place-point-in-time-recovery-pitr) that mark a restoration as active, and specify which backup to use.
		* 2.2.2\) To actually activate the restore operation, run: `npm start backend.restoreDBBackup_apply` This will update the `.../pgbackrest-restore` annotation on the postgres-operator CRD to the current-time, which the operator interprets as the "go signal" to apply the specifying restoration operation.
* 4\) Observe the logs in the Tilt UI (atm, the restore operation's logs are visible in the "uncategorized" tilt-resource), to track the progress of the restore.
	* Note: It takes about 2.5 minutes just to start, so be patient; you'll know it's done when the logs say `restored log file "XXX.history" from archive`. (along with the `HINT: Execute pg_wal_replay_resume() to promote.`, which must be followed to complete; see link in 2.1.2.1.1 for more info)
	* Note: You can ignore the `WARN: --delta or --force specified but unable to find...` message, as that just means it's a fresh cluster that has to restore from scratch, which the restore module finds odd since it notices the useless [automatically added] delta/force flag)
	* Note: Until the restore process is completely done (eg. with the pgo operator having had time to update the admin-user auth-data secret), the app-server will be failing to start/connect; this is normal/fine.
* 5\) Check whether the restore operation succeeded, by loading up the website. (you may have to wait a bit for the app-server to reconnect; you can restart it manually to speed this up)
	* 5.1\) If you get an error in the `app-server` pod along the lines of `error: password authentication failed for user "admin"`, then it seems the `debate-map-pguser-admin` secret was already created (by pgo) prior to the restore, which may have made it invalid after the restore was completed (if the credentials differ). To resolve this, you can either:
		* 5.1.1\) Delete the `debate-map-pguser-admin` secret in the `postgres-operator` namespace; pgo will recreate it in a few seconds, with a working set of credentials (and the reflected version of the secret, in the `default` namespace, will be updated a few seconds later). Note that in this process, the admin user's password is actually reset to a new (random) value, so you will have to copy the secret's password value for use in third-party programs accessing the database (eg. DBeaver).
		* 5.1.2\) Alternately, you can modify the `debate-map-pguser-admin` secret (in the `postgres-operator` namespace) to hold the password value that was stored in the postgres backup that was just restored (this approach not yet tested, but presumably should work). One place you may have the old password stored is in DBeaver's password store, which can you decrept using [these instructions](https://stackoverflow.com/a/58223703).
* 6\) If the restore operation did not succeed, you'll want to either make sure it does complete, or cancel the restore operation (else it will keep trying to apply the restore, which may succeed later on when you don't want or expect it to, causing data loss). To cancel the restore:
	* 6.1\) If option 1 was taken: Recomment the `dataSource` field in `postgres.yaml`, then save the file.
	* 6.2\) If option 2 was taken: Run: `npm start backend.restoreDBBackup_cancel`.
* 7\) After the restore is complete, clean things up:
	* 7.1\) If option 1 was taken: Recomment the `dataSource` field in `postgres.yaml`, then save the file. (needed so the restore operation is not attempted for other contexts, when their tilt-up scripts are run)
	* 7.2\) If option 2 was taken: No action is necessary, because the postgres-operator remembers that the last-set value for the `pgbackrest-restore` annotation has already been applied, and the restore config was only placed into the target context. (If you want to be extra sure, though, you could follow step 6.2; this is fine, because the restore has already taken place, so it will not be reverted or the like.)
* 8\) Note that after the restore (if using option 1 anyway), the password for the admin user may have changed (it seems to have this time anyway). If that happens, retrieve the new password from the `debate-map-pguser-admin` secret (eg. using Lens, though make sure to press the eye icon to decode it first!), and update the passwords stored in DBeaver and the like.

</details>

<!----><a name="pgbackrest-troubleshooting"></a>
<details><summary><b>[pgbackrest-troubleshooting] How to resolve various pgBackRest issues</b></summary>

* 1\) If you ever get the error `command terminated with exit code 28: ERROR: [028]: backup and archive info files exist but do not match the database HINT: is this the correct stanza? HINT: did an error occur during stanza-upgrade?`, do the following:
	* 1.1\) First reference [this comment](https://github.com/pgbackrest/pgbackrest/issues/1066#issuecomment-907802025) for some general info. (in retrospect, I think my observations there were only partly true, so take with a grain of salt)
	* 1.2\) Open a shell in the `debate-map-instance1-XXX` pod (using Lens or `npm start ssh.db`).
	* 1.3\) Run `pgbackrest info`. This should tell you which repos are having backup issues. Note that if repo1 (in-k8s backup) is having an issue, this appears to block backups to repo2 (cloud storage backup), so you'll likely have to debug/resolve repo1 issues first before making progress on repo2's.
	* 1.4\) Run `pgbackrest check --stanza=db` (note the stanza name: `db`). This should give the same error message that was encountered in the general pgo logs (the `[028] backup and archive files exist but do not match the database` error).
	* 1.5\) It might also be helpful to confirm that things look correct in various configuration files: `/etc/pgbackrest.conf`, `/etc/pgbackrest/conf.d/debate-map-instance1-XXXX.conf`
	* 1.6\) For actually resolving the issue:
		* 1.6.1\) First, think about what caused the backups to start failing. The reasons so far have been due to, eg. swapping out my k8s node for another one (4gb variant to 8gb). If that's the case, the changes needed to get the backups working again are probably minimal.
		* 1.6.2\) I don't know exactly what got the backups working again, but here the main actions I took, and in roughly the order I attempted (with something in there apparently resolving the issue):
			* 1.6.2.1\) Changing the `repo2-path` field in `postgres.yaml` from `/db-backups-pgbackrest` to `/db-backups-pgbackrest-X` for a while (with various actions, including the below, then taken), then changing it back. (with tilt-up running during this time)
			* 1.6.2.2\) Changing the `shutdown` field in `postgres.yaml` to `true` for a while; once I saw the database pods shut-down (other than `pgo` and the metrics-collectors), I commented the field again, causing the db pods to restart.
			* 1.6.2.3\) Attempting to run a manual backup, by running: `npm start backend.makeDBBackup`. (The pods attempting to make this backup did not start right away, iirc. When it did start [while messing with some of the steps below], it hit various errors [50, 82, then 62]. Eventually it succeeded, after the `pgbackrest start` command I believe -- at which point the regular cron-jobs showed up in Lens, and from those a full-backup job was created and completed.)
			* 1.6.2.4\) In the `debate-map-instance1-XXX` pod, run: `pgbackrest stanza-upgrade --stanza=db`. (failed with `ERROR: [055]: unable to load info file '/db-backups-pgbackrest-2/archive/db/archive.info' or '/db-backups-pgbackrest-2/archive/db/archive.info.copy': [...]`, but maybe it kickstarted something)
			* 1.6.2.5\) In the same pod, run `pgbackrest stop`, followed by `pgbackrest start` a few minutes later. (the `stop` command's effects didn't seem to complete when I tried it, so I ran `start` later to get things up and running again, after trying the other steps)

</details>





### Miscellaneous
