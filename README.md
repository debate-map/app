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

# Development

## Setup

### Part 1 (general)

1) Ensure [NodeJS](https://nodejs.org) (v14.13.0+) is installed, as well as [Yarn](https://yarnpkg.com/getting-started/migration) (needed for Yarn workspaces).

2) Clone/download this repo to disk. (https://github.com/debate-map/app.git)

3) Install this repo's dependencies by running: `yarn`

4) Ensure the yarn symlinks are set up properly. (they are currently hard-coded; instructions to be written)

### Part 2 (client)

5) Follow the instructions here: <https://github.com/debate-map/app/tree/master/Packages/client#setup>

### Part 3 (server)

> This part is only necessary if you're making changes to the backend, or otherwise want to run your own server instance.

6) Follow the instructions here: <https://github.com/debate-map/app/tree/master/Packages/server#setup>

## Editing + running

1) It's recommended to open two VSCode windows:
   * The first in the `Packages/client` folder, for the ui and other frontend code.
   * The second in the repo root, for everything else. (helps separate the concerns/contexts into roughly two halves)
2) In vscode #1, start frontend ts-compiler: ctrl+shift+b, then `#1 tsc`.
3) In vscode #1, start frontend webpack/dev-server: ctrl+shift+b, then `#2 webpack`.
4) In vscode #2, start backend compiler: ctrl+shift+b, then `#1 server.dev`.
5) In vscode #2, start db-shape tracker: ctrl+shift+b, then `#2 server.trackDBShape`.
6) In vscode #2, start backend: ctrl+shift+b, then `#3 server.run`.
7) Open website locally at: `localhost:3005`