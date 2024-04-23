# Local dependency changes

This document describes the recommended route for making local modifications to a dependency, and testing it in this project (debate map), without having to push your changes to GitHub or make an NPM publish.

## Approach 1 (recommended)

**NOTE:** I'm in the process of designing a more streamlined alternative to [yalc](https://github.com/wclr/yalc); once completed, the workflow below should be simplified further.

Setup -> initial publishing of dependency:
* 1\) Ensure that the tool [yalc](https://github.com/wclr/yalc) is installed: `npm install -g yalc`
* 2\) Find the GitHub repo for the dependency in question, and clone it to disk.
* 3\) In the dep's cloned repo, run: `yalc publish` (or `yalc push`)

Setup -> initial connection of dependency:
* 1\) Run the following command (in the folder specified in note below): `yalc add --pure DEP_NAME`
	* NOTE: Run it in `Packages/web-vcore` IF the given dependency is listed under `dependencies` of [Packages/web-vcore/package.json](https://github.com/debate-map/app/tree/main/Packages/web-vcore/package.json) ; else run it in the repo root.

To make local changes to a dependency (already connected through the setup steps above) and see it show up in debate-map:
* 1\) Run (in repo root): `npm run yalc-up`
	* Explanation: This adds entries to `resolutions` in `package.json` (then runs `yarn install`) to have yarn create symlinks from `node_modules/DEP_NAME` to either `.yalc/DEP_NAME` or `Packages/web-vcore/.yalc/DEP_NAME` (depending on where you ran `yalc add`).
	* 1.1\) At the moment, you usually also need to restart webpack at this point. (arguably a bug in webpack's watcher system)
* 2\) Repeat the loop of:
	* 2.1\) Make code changes in the dependency.
	* 2.2\) Run (in dep): `yalc push`
		* Explanation: This updates debate-map's `[...]/.yalc/DEP_NAME` folder with the new contents, which is seen through the `node_modules/DEP_NAME` symlink as well, and thus processed by tsc/webpack.
	* NOTE: Step 2.2 should be sufficient if using the default dependency-connection approach. However, if you modify `Scripts/zalc2.js` to use the `file:` protocol rather than `portal:` (eg. if `portal:` is causing problems for some reason), then you'll need to also run `npm run yalc-up` after `yalc push` -- as well as restarting webpack currently, as webpack seems to have a bug of not detecting changes to `file:` protocol output folders after a `yarn install`.

To commit your changes: (assuming changes were made in dependency repo as well as debate-map repo)
* 1\) In dep's repo:
	* 1.1\) Commit and push your changes. (to whatever branch you have access to)
	* 1.2\) Make a pull-request.
* 2\) In debate-map repo:
	* 2.1\) Run: `npm run yalc-down`
		* Explanation: This removes the entries from `resolutions` in `package.json`, and reruns `yarn install`, thus clearing the symlinks in `node_modules` as well.
		* 2.1.1\) At the moment, you usually also need to restart webpack at this point (arguably a bug in webpack's watcher system) -- unless of course you plan to rerun yalc-up shortly (as seen below), in which case just leave webpack running through this process.
	* 2.2\) Commit and push your changes (to whatever branch you have access to).
	* 2.3\) Make a pull-request; in this pull-request's description, also link to the pull-request in the dependency repo.
	* 2.4\) Run: `npm run yalc-up` (not needed if you're done for the day, and expect the pull-requests to be merged by the next time you work)