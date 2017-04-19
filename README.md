# Debate Map

[![Join the chat at https://gitter.im/DebateMap/Lobby](https://badges.gitter.im/DebateMap/Lobby.svg)](https://gitter.im/DebateMap/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![See the task list at https://trello.com/b/7ZhagPiN](https://img.shields.io/badge/tasks-on%20trello-blue.svg)](https://trello.com/b/7ZhagPiN)

The [Debate Map](https://debatemap.live) project is an innovative new platform for presenting and analyzing beliefs (or "theses") and the arguments that support them. Its content is crowd-sourced (like Wikipedia), and the software is open-source (under MIT), promoting collaborative development and increased accountability.

There are three types of maps present on the site: personal maps, debate maps, and [the global map](https://debatemap.live/global).

The below is a screenshot from the global map:
![See the task list at https://trello.com/b/7ZhagPiN](/Info/Images/Screenshot1.png)

The tree-like structure assists in traversing the various lines of evidence: at each level, there is a "thesis" (blue) which makes a claim, and a set of simple "arguments" (green and red) which support/oppose it. By keeping the forms of these arguments simple, we're able to match them (in many cases) with the basic forms of logical arguments (modus ponens, etc.), permitting quick evaluation of the logical connections -- this saves time, and lets us focus on the underlying chain of evidence instead of parsing statement meanings.

For more information, visit the website at: <https://debatemap.live>

### Workspace setup

1) Clone the repo to disk: <https://github.com/Venryx/DebateMap.git>
2) Run `npm install` in the root project folder.
3) Revert the `node_modules` folder. (it has some git-tracked modifications, which get overwritten during `npm install`)

Recommended editor: [Visual Studio Code](https://code.visualstudio.com)  
Recommended browser: [Chrome](https://www.google.com/chrome)

Note that I haven't actually verified the project works on a fresh clone, so if it fails for you, I probably just forgot a step or two, so make an issue describing where you're stuck.

### Firebase setup + project config

1) Create two Google Firebase projects -- one for development, one for production.
2) Edit the `.firebaserc` and `config/environments.js` files, replacing their paths and data with your own.
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

### Deploying to Firebase

1) Run `npm run deploy-dev` or `npm run deploy-prod`. (depending on which Firebase project you're targeting -- as configured above)