import {createRequire} from "module";

// the script below finds the versions of each web-vcore subdependency (in web-vcore/package.json), and updates the package.json of the calling project to include those versions in the "resolutions" field of its package.json

// we could either add a reference from "./Scripts/tsconfig.json" to "./tsconfig.json", or we could use require; doing latter for now
//import wvcPackageJSON from "../../package.json";
const require = createRequire(import.meta.url);
const wvcPkg = require("../package.json");

//const outerPkg = require("../../../package.json");

for (const [depName, depVersion] of Object.entries(wvcPkg.dependencies) as [string, string][]) {
	const exactVersionRegex = /^[\d.]+$/;
	if (depVersion.match(exactVersionRegex) == null) {
		console.log(`Dependency version is not exact; skipping: ${depName}`);
		continue;
	}
	

}