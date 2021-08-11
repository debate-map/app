# Debate Map

Monorepo for the client, server, etc. of the Debate Map website ([debatemap.app](https://debatemap.app)).

> Note: The "master" branch of this repo is showing the codebase for the new monorepo setup, using [Postgraphile](https://github.com/graphile/postgraphile) for its database/backend rather than Firestore. It is still in development, so the <https://debatemap.app> website will have some discrepancies until this new version is ready and published.

# Overview

The [Debate Map](https://debatemap.app) project is a web platform aimed at improving the efficiency of discussion and debate. It's crowd-sourced and open-source, and welcomes reader contributions.

Its primary improvements are (in short):
* Restructuring dialogue to make use of both dimensions.
* Breaking down lines of reasoning into single-sentence "nodes".
* Providing rich tools that operate on those nodes -- such as rating, tagging, statistical analysis, and belief-tree sharing and comparison.

The maps are constructed from "theses" (blue) which make claims, and "arguments" (green and red) which support/oppose those claims. This structure cuts down on reading time, and lets us focus on the underlying chains of reasoning instead of parsing statement meanings and connections.

For more information, visit the website at: <https://debatemap.app>

# Freeform documentation

* [Client/server infrastructure](https://github.com/debate-map/app/tree/master/Docs/ClientServerInfrastructure.md)
* [Authentication](https://github.com/debate-map/app/tree/master/Docs/Authentication.md)
* [Access policies](https://github.com/debate-map/app/tree/master/Docs/AccessPolicies.md)
* [User reputation](https://github.com/debate-map/app/tree/master/Docs/UserReputation.md)
* [Node revisions](https://github.com/debate-map/app/tree/master/Docs/NodeRevisions.md)

# Guide modules

## General

<!----><a name="setup-general"></a>
### [setup-general] General repo setup

1) Ensure [NodeJS](https://nodejs.org) (v14.13.0+) is installed, as well as [Yarn](https://yarnpkg.com/getting-started/migration) (needed for Yarn workspaces).
2) Clone/download this repo to disk. (https://github.com/debate-map/app.git)
3) Install this repo's dependencies by running: `yarn install`
4) [temp] Fix the typing issue in recharts `node_modules/recharts/types/polar/Radar.d.ts`, replacing the `<P, T>` sections with `<any, any>`.

<!----><a name="vscode"></a>
### [vscode] VSCode window setup

Prerequisite steps: [setup-general](https://github.com/debate-map/app#setup-general)

It's recommended to split your dev setup into two vscode windows:
1) Window #1 in the `Packages` folder. Use this window to open files in `Packages/client`. (opening files in `Packages/common` is also fine)
2) Window #2 in the repo root, for everything else. (server development, deployment, etc.)

Reasons:
* About half of the development work is done in `Packages/client`, since it is the "driver" of most changes/functionality. And having the workload split between the two windows (by "area of concern"), helps maintain tab-count sanity, and clarity of where a given file/tab should be located.
* A separate `tasks.json` file has been set up for the two folders, so having vscode windows open in them both makes it is easier to follow the guide-module instructions. That said, a single vscode-window should work, but you'll need to reference the `tasks.json` or `package-scripts.js` files to manually run certain scripts/commands. 

## Package: client

Guide modules for ["client" package](https://github.com/debate-map/app/tree/master/Packages/client):
* [client/dev](https://github.com/debate-map/app/tree/master/Packages/client#dev)
* [client/dev-enhance](https://github.com/debate-map/app/tree/master/Packages/client#dev-enhance)

## Package: web-server

> These modules are only necessary if you're making changes to the backend, or otherwise want to run your own server instance.

Guide modules for ["web-server" package](https://github.com/debate-map/app/tree/master/Packages/web-server): (provider of the static html, css, js, etc. files)
* [web-server/local-docker](https://github.com/debate-map/app/tree/master/Packages/web-server#local-docker)
* [web-server/local-k8s](https://github.com/debate-map/app/tree/master/Packages/web-server#local-k8s)

## Package: server

> These modules are only necessary if you're making changes to the backend, or otherwise want to run your own server instance.

Guide modules for ["server" package](https://github.com/debate-map/app/tree/master/Packages/server): (the app-server that runs graphql, the database, etc.)
* [server/general](https://github.com/debate-map/app/tree/master/Packages/server#general)
* [server/local-base](https://github.com/debate-map/app/tree/master/Packages/server#local-base)
* [server/local-docker](https://github.com/debate-map/app/tree/master/Packages/server#local-docker)
* [server/local-k8s](https://github.com/debate-map/app/tree/master/Packages/server#local-k8s)
* [server/docker-trim](https://github.com/debate-map/app/tree/master/Packages/server#docker-trim)
* [server/db-migrate](https://github.com/debate-map/app/tree/master/Packages/server#db-migrate)

## Package: deploy

> These modules are only necessary if you're making changes to the backend, or otherwise want to run your own server instance.

Guide modules for ["deploy" package](https://github.com/debate-map/app/tree/master/Packages/deploy): (things relating to Kubernetes, etc.)
* [deploy/k8s-local](https://github.com/debate-map/app/tree/master/Packages/deploy#k8s-local)
* [deploy/k8s-remote](https://github.com/debate-map/app/tree/master/Packages/deploy#k8s-remote)
* [deploy/k8s-psql](https://github.com/debate-map/app/tree/master/Packages/deploy#k8s-psql)
* [deploy/k8s-view-pg-config](https://github.com/debate-map/app/tree/master/Packages/deploy#k8s-view-pg-config)