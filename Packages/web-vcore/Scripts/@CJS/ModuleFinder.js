const process = require("process");
const paths = require("path");
const fs = require("fs");

/**
Helpful for finding the path to a subdependency of web-vcore, regardless of:
1) Whether caller is in monorepo (and where in the monorepo they are).
2) Whether caller has web-vcore symlinked.
*/
module.exports.FindWVCNodeModule = function(name, relativeTo = process.cwd()) {
	// (the below could maybe be simplified through use of __dirname)
	const pathsToTry = [
		// for script/vscode-window loaded from "{repoRoot}"
		paths.join(relativeTo, `./node_modules/web-vcore/node_modules/${name}`),			// with web-vcore symlinked
		paths.join(relativeTo, `./node_modules/${name}`),											// with web-vcore not symlinked
		// for script/vscode-window loaded from "{repoRoot}/Packages" (in monorepo)
		paths.join(relativeTo, `../node_modules/web-vcore/node_modules/${name}`),			// with web-vcore symlinked
		paths.join(relativeTo, `../node_modules/${name}`),											// with web-vcore not symlinked
		// for script/vscode-window loaded from "{repoRoot}/Packages/X" (in monorepo)
		paths.join(relativeTo, `../../node_modules/web-vcore/node_modules/${name}`),		// with web-vcore symlinked
		paths.join(relativeTo, `../../node_modules/${name}`),										// with web-vcore not symlinked
	];
	const path = pathsToTry.find(a=>fs.existsSync(a));
	if (path == null) throw new Error(`Failed to find web-vcore node-module "${name}".`);
	return path;
};