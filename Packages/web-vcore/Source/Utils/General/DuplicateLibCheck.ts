// only set prototype methods if they don't already exist (ie. if this is the first copy of the mobx-graphlink lib being loaded)
if (globalThis.webVCoreInitCount > 0) {
	// if overrides already exist, it means this library must have been loaded more than once; warn
	console.error(`
It appears that more than one copy of the web-vcore package has been loaded, which is almost certainly not desired.${""
} This is most likely caused by a usage of zalc-publish that ended up botching the yarn.lock file. (zalc is used to replace the npm-published web-vcore, with a local build of the package)
To fix this, try the following:
1) Note the version for \`web-vcore\` listed in package.json.
2) Run \`npm add web-vcore\`.
3) Change package.json to again use the version noted earlier.
4) Redeploy the frontend code for your app.
Note: Despite the package.json ending up the same, this process (should) have the effect of replacing the npm-sourced web-vcore with a symlink to .yalc/web-vcore, fixing the duplication issue;${""
} and this fix persists through future yarn-installs, since the regular resolution rules are then able to merge the two web-vcore instances (from the workspaces entry for .yalc/web-vcore, and the regular npm dependency),${""
} resulting in yarn creating a symlink from "node_modules/web-vcore" to ".yalc/web-vcore", which is what we want.
	`.trim());
} else {
	globalThis.webVCoreInitCount = globalThis.webVCoreInitCount ?? 0;
	globalThis.webVCoreInitCount++;
}