# Local dependency changes

This document describes the recommended route for making local modifications to a dependency, and testing it in this project (debate map), without having to push your changes to GitHub or make an NPM publish.

## Approach 1 (recommended)

**NOTE:** I'm in the process of designing a more streamlined alternative to [yalc](https://github.com/wclr/yalc) (the start of this can be seen in [Scripts/zalc2.js](https://github.com/debate-map/app/tree/main/Scripts/zalc2.js)); once completed, the workflow below should be simplified further.

Setup -> initial publishing of dependency:
* 1\) Ensure that the tool [yalc](https://github.com/wclr/yalc) is installed: `npm install -g yalc`
* 2\) Find the GitHub repo for the dependency in question, and clone it to disk.
* 3\) In the dep's cloned repo, run: `yalc publish` (or `yalc push`)

Setup -> initial connection of dependency:
* 1\) Run the following command (in the folder specified in note below): `yalc add --pure DEP_NAME`
	* NOTE: Run it in `Packages/web-vcore` IF the given dependency is listed under `dependencies` of [Packages/web-vcore/package.json](https://github.com/debate-map/app/tree/main/Packages/web-vcore/package.json) ; else run it in the repo root.
* 2\) If webpack had been running, restart it at this point. (so it can notice the yalc entry for this dep, and therefore enable watching of `node_modules/DEP_NAME`, even without version changes [which is webpack's default heuristic])

To make local changes to a dependency (already connected through the setup steps above) and see it show up in debate-map:
* 1\) Run (in repo root): `npm run yalc-up` (if tsc or webpack error here, see Troubleshooting point 1)
	* Explanation: This adds entries to `resolutions` in `package.json` (then runs `yarn install`) to have yarn create symlinks from `node_modules/DEP_NAME` to either `.yalc/DEP_NAME` or `Packages/web-vcore/.yalc/DEP_NAME` (depending on where you ran `yalc add`).
* 2\) Repeat the loop below: (while coding/testing your changes)
	* 2.1\) Make code changes in the dependency.
	* 2.2\) Run (in dep): `yalc push`
		* Explanation: This updates debate-map's `[...]/.yalc/DEP_NAME` folder with the new contents, which is seen through the `node_modules/DEP_NAME` symlink as well, and thus processed by tsc/webpack.
	* NOTE: Step 2.2 should be sufficient if using the default dependency-connection approach. However, if you modify `Scripts/zalc2.js` to use the `file:` protocol rather than `portal:` (eg. if `portal:` is causing problems for some reason), then you'll need to also run `npm run yalc-up` after `yalc push`. (if tsc or webpack error here, see Troubleshooting point 1)

To commit your changes: (assuming changes were made in dependency repo as well as debate-map repo)
* 1\) In dep's repo:
	* 1.1\) Commit and push your changes. (to whatever branch you have access to)
	* 1.2\) Make a pull-request.
* 2\) In debate-map repo:
	* 2.1\) Run: `npm run yalc-down` (if tsc or webpack error here, see Troubleshooting point 1 -- unless done for the day anyway)
		* Explanation: This removes the entries from `resolutions` in `package.json`, and reruns `yarn install`, thus clearing the symlinks in `node_modules` as well. (this step is needed, because otherwise the `yarn.lock` file that gets pushed to GitHub would contain package resolutions that target "0.0.0-local", which will not exist for all devs and would thus cause versioning instability/divergences between dev machines)
	* 2.2\) Commit and push your changes (to whatever branch you have access to).
	* 2.3\) Make a pull-request; in this pull-request's description, also link to the pull-request in the dependency repo. (so maintainers know to merge the dependency pull-request first)
	* 2.4\) Run: `npm run yalc-up` (if tsc or webpack error here, see Troubleshooting point 1 -- unless done for the day anyway, in which case you could even skip this step entirely, if PR will be merged by next work session)

### Troubleshooting

* 1\) If webpack or tsc (in vscode or terminal) error after running `npm run yalc-[up/down]`, it generally means you'll need to restart that tsc/webpack instance. For vscode's built-in tsc server, you can run the "Developer: Restart Extension Host" command. For tsx or webpack in the terminal, just ctrl+c (multiple times) to kill the process, then rerun the same tsc/webpack command.
	* Note: The flakiness of the folder/file watching appears to be more fragile in webpack than in tsc. I have tried to improve the robustness by trying different values in `webpackConfig.snapshot`, but have only been able to get it to "work usually" -- it's fairly often that webpack hits some sort of "file was expected but not found" error (paraphrasing the message), at which point I just have to restart the process. Not ideal, but at least better than the old situation where the `yalc.lock` file would be inconsistent between different developers' machines (using just yalc/zalc and a ".yalc/*" entry in yarn's workspaces array).