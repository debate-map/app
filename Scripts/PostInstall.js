const fs = require("fs");
const pathMod = require("path");
const globby = require("globby");

// needed to fix issue with ESM-imports in NodeJS; see here for more info: https://github.com/nodejs/node/issues/34515
// (alternative to using patch-package, which is more of a hassle, due to patch-creation being difficult for yarn)
/*fs.writeFileSync("./node_modules/@wewatch/lexorank/dist/esm/package.json", JSON.stringify({
	type: "module",
}));
const basePath = "./node_modules/@wewatch/lexorank/dist/esm/";
globby("**#/*.js", {
	cwd: basePath,
	absolute: true,
}).then(paths=>{
	for (const path of paths) {
		const oldText = fs.readFileSync(path).toString();
		const newText = oldText.replace(/ from "(.+?)";/g, (matchStr, g1)=>{
			//console.log({path, matchStr, g1});
			// if original import-path resolved to actual file, leave as-is
			if (fs.existsSync(basePath + g1) && !fs.lstatSync(basePath + g1).isDirectory()) return matchStr;

			const importPath_fixed = resolveImportPath(pathMod.dirname(path), g1);
			//console.log({importPath_fixed});
			return ` from "${importPath_fixed}";`;
		});
		fs.writeFileSync(path, newText);
	}
});*/

function resolveImportPath(cwdForImport, subpath) {
	/*const cwd = process.cwd();
	process.chdir(cwdForImport);
	const resolvedPath = require.resolve(subpath);
	process.chdir(cwd);
	return resolvedPath;*/
	const resolvedPath = require.resolve(subpath, {
		paths: [cwdForImport],
	});
	const resolvedPath_rel = pathMod.relative(cwdForImport, resolvedPath);
	return `./${resolvedPath_rel.replace(/\\/g, "/")}`; // always use forward-slashes, since that's what js-imports always use
}