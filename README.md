# Debate Map

[![Join the chat at https://gitter.im/DebateMap/Lobby](https://badges.gitter.im/DebateMap/Lobby.svg)](https://gitter.im/DebateMap/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![See the task list at https://trello.com/b/7ZhagPiN](https://img.shields.io/badge/tasks-on%20trello-blue.svg)](https://trello.com/b/7ZhagPiN)

The [Debate Map](https://debatemap.live) project is an interactive web platform aimed at improving the efficiency of discussion and debate. It's crowd-sourced and open-source, and welcomes reader contributions.

Its primary improvements are (in short):
* Restructuring dialogue to make use of both dimensions.
* Breaking down lines of reasoning into single-sentence "nodes".
* Providing rich tools that operate on those nodes -- such as rating, tagging, statistical analysis, and belief-tree sharing and comparison.

The below is a screenshot from the global map:
![See the task list at https://trello.com/b/7ZhagPiN](/Info/Images/Screenshot1.png)

The tree-like structure assists in traversing the various lines of evidence: at each level, there is a "thesis" (blue) which makes a claim, and a set of simple "arguments" (green and red) which support/oppose it. By keeping the forms of these arguments simple, we're able to match them (in many cases) with the basic forms of logical arguments (modus ponens, etc.), permitting quick evaluation of the logical connections -- this saves time, and lets us focus on the underlying chain of evidence instead of parsing statement meanings.

For more information, visit the website at: <https://debatemap.live>

### Workspace setup

1) Clone the repo to disk: <https://github.com/Venryx/DebateMap.git>
2) Run `npm install` in the root project folder.
3) Revert the `node_modules` folder. (it has some git-tracked modifications, which get overwritten during `npm install`)

Note that I haven't actually verified the project works on a fresh clone, so if it fails for you, I probably just forgot a step or two, so make an issue describing where you're stuck.

For recommended setup of your code editor and other tools, see: [Editor setup](#editor-setup)

### Firebase setup + project config

1) Create two Google Firebase projects -- one for development, one for production.
2) Edit the `.firebaserc` and `config/index.js` files, replacing their paths and data with your own.
3) Add at least one form of authentication to your Firebase projects. (Google sign-in is easiest)
4) Run the project locally. (see "Running locally" section below)
5) Sign in once (using the panel at the top-right), then check the database and copy your user ID.
6) Go to the "More>Admin" page, and press "Reset database".
7) Add the following data to the database using Firebase management:
```
{
	userExtras: {
		[your user id]: {
			permissionGroups: {basic: true, verified: true, mod: true, admin: true}
		}
	}
}
```

### Running locally

1) Run `npm run dev` in the root project folder.
2) Navigate to `localhost:3000`.

Note that if you add/remove/modify any modules required from `config/Vendors.js`, you'll then need to run `npm run create-vendors[-quick]`. (those modules are compiled separately, to speed up the main compile process)

### Deploying to Firebase

1) Run `tsc` in a console, and keep it running in the background. (this reduces deploy:prod-quick compile times from ~59s to ~32s, by enabling incremental compilation)
2) Run `npm run deploy:[dev/prod/prod-quick]`. Note that deploy:prod-quick time is ~32s, vs ~86s for deploy:prod (since it doesn't use minification and such).

### Editor setup

The below are optional recommendations on your editor setup, which will make editing the project more efficient and less error-prone. (since it matches the setup I use)

Browser: [Chrome](https://www.google.com/chrome)  
Editor: [Visual Studio Code](https://code.visualstudio.com)  
VSCode extensions:
* [Search node_modules](https://marketplace.visualstudio.com/items?itemName=jasonnutter.search-node-modules): Very helpful for quickly opening files in modules under `node_modules`.
* [TypeScript Importer](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint): Lets you press alt+enter to auto-import the current symbol from whatever module it's in.
* [TypeScript Hero](https://marketplace.visualstudio.com/items?itemName=rbbit.typescript-hero): Same as above. This one's not quite as nice, but picks up some that the above misses. Also, it has an "import all missing" command.
<!--
* [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint): Shows warnings when code does not match the project's coding style.
-->