const fs = require("fs");
const paths = require("path");
//const {execSync} = require("child_process");
//import {createRequire} from "module";

//import {dirname} from "path";
//import {fileURLToPath} from "url";
//const __dirname = dirname(fileURLToPath(import.meta.url));

function FixForYalc(/** @type {string} */ path) {
	const parts = path.replace(/\\/g, "/").split("/");
	if (parts.slice(-3)[0] == ".yalc") {
		return [...parts.slice(0, -3), "node_modules", ...parts.slice(-2)].join("/");
	}
	return path;
}
const __dirname_fixed = FixForYalc(__dirname);
//const cwd_fixed = FixForYalc(process.cwd());

//const PathFromWVC = subPath=>paths.join(__dirname, "..", subPath);
const PathFromWVC = subPath=>{
	//return paths.resolve(__dirname, "..", "..", subPath).replace(/\\/g, "/"); // patch-package expects forward-slashes (eg. for finding files in the patches-dir)
	return paths.resolve(__dirname_fixed, "..", "..", subPath).replace(/\\/g, "/"); // patch-package expects forward-slashes (eg. for finding files in the patches-dir)
};

//const require = createRequire(import.meta.url);
const patchPackagePath =
	fs.existsSync(PathFromWVC("node_modules/patch-package")) ? PathFromWVC("node_modules/patch-package") :
	fs.existsSync(PathFromWVC("../../node_modules/patch-package")) ? PathFromWVC("../../node_modules/patch-package") :
	(()=>{ throw new Error(`Could not find patch-package, relative to:${PathFromWVC(".")}`); })();
const require_patch = subpath=>require(`${patchPackagePath}/dist/${subpath}`);

const getPatchFiles_orig = require_patch("patchFs.js").getPatchFiles;
const getPackageDetailsFromPatchFilename_orig = require_patch("PackageDetails.js").getPackageDetailsFromPatchFilename;
const process_exit_orig = process.exit;
//console.log("Test1;", process.cwd(), __dirname, __dirname_fixed);
/** @type {string[]} */ const skippedPatches = [];
for (const patchFile of fs.readdirSync(PathFromWVC("patches"))) {
	let orgName, packageName;
	if (patchFile.startsWith("@")) {
		[, orgName, packageName] = patchFile.match(/@(.+?)\+(.+?)\+/);
	} else {
		packageName = patchFile.match(/(.+?)\+/)?.[1];
	}
	//console.log("Path:", patchFile, "@Org:", orgName, "@Pkg:", packageName);

	const orgPlusPackageSubpath = orgName ? `@${orgName}/${packageName}` : packageName;
	const isSubdepUnderWVC = fs.existsSync(PathFromWVC(`node_modules/${orgPlusPackageSubpath}`));
	//const isSubdepAsPeer = fs.existsSync(PathFromWVC(`../${orgPlusPackageSubpath}`));
	const isSubdepAsPeer = fs.existsSync(PathFromWVC(`../../node_modules/${orgPlusPackageSubpath}`));

	//let result;
	if (isSubdepUnderWVC) {
		if (process.argv.includes("level=0")) { skippedPatches.push(patchFile); continue; }
		console.log(`Applying patch for ${patchFile}, at subdep path: ${PathFromWVC(`node_modules/${orgPlusPackageSubpath}`)}`);
		ApplyPatch(patchFile, true);
		//result = execSync(`git apply --ignore-space-change --ignore-whitespace patches/${patchFile}`);
	} else if (isSubdepAsPeer) {
		if (process.argv.includes("level=1")) { skippedPatches.push(patchFile); continue; }
		console.log(`Applying patch for ${patchFile}, at peer path: ${PathFromWVC(`../../node_modules/${orgPlusPackageSubpath}`)}`);
		ApplyPatch(patchFile, false);
		//result = execSync(`cd ../.. && git apply --ignore-space-change --ignore-whitespace node_modules/web-vcore/patches/${patchFile}`);
	} else {
		throw new Error(`Cannot find package as either subdep or peer:${orgPlusPackageSubpath}`);
	}
	//console.log("Patch-apply result:", result);
}
if (skippedPatches) {
	console.log("Skipped the following patch-files (since found at wrong level):", skippedPatches);
}

var errorsHit;
if (errorsHit) {
	//throw new Error("Errors hit applying patches; canceling build.");
	console.error("Errors hit applying patches; canceling build.");
	//process_exit_orig(shouldExitWithError ? 1 : 0);
	process_exit_orig(0);
}

function ApplyPatch(/** @type {string} */ patchFile, /** @type {boolean} */ asSubdep) {
	//console.log("Test2:", orgPlusPackageSubpath);
	//require_patch("patchFs.js").getPatchFiles = ()=>[patchFile]; // monkey-patch
	// monkey-patch
	require_patch("patchFs.js").getPatchFiles = (...args)=>{
		const fullList = getPatchFiles_orig(...args);
		const result = fullList.filter(a=>paths.basename(a) == patchFile);
		if (result.length != 1) throw new Error(`Failed to find match for "${patchFile}" in list:${fullList.join(", ")}`);
		return result;
	};

	//const appPath = require_patch("./getAppRootPath").getAppRootPath();
	//const appPath = orgPlusPackageSubpath.startsWith("..") ? "../.." : ".";
	const appPath = asSubdep ? PathFromWVC(".") : PathFromWVC("../..");
	//const reverse = !!argv["reverse"];
	const reverse = false;
	//const shouldExitWithError = !!argv["error-on-fail"] || is_ci_1.default || process_1.default.env.NODE_ENV === "test";
	const shouldExitWithError = false;
	//console.log("Patch dir:", PathFromWVC("patches"));
	try {
		process.exit = (()=>{}); // keep patch-package from quitting as soon as an error occurs

		process["cwd_orig"] = process["cwd_orig"] ?? process.cwd;
		process.cwd = ()=>appPath; // cwd must match with appPath, because of something in patch-package
		// monkey-patch
		/*require_patch("PackageDetails.js").getPackageDetailsFromPatchFilename = (...args)=>{
			const result = getPackageDetailsFromPatchFilename_orig(...args);
			result.path = paths.join(appPath, result.path); // fix path
			console.log("Test:", result.path);
			return result;
		};*/

		const patchDir = paths.relative(appPath, PathFromWVC("patches")); // patch-package wants this relative to app-path
		//console.log("AppPath:", appPath, "PatchDir:", patchDir);
		require_patch("applyPatches.js").applyPatchesForApp({
			appPath,
			reverse,
			//patchDir: "./patches",
			patchDir,
			//patchDir: asSubdep ? `./node_modules/web-vcore/patches` : `./patches`,
			shouldExitWithError,
		});
		//throw new Error("Test3");
	} catch (ex) {
		console.error(ex);
		errorsHit = true;
	}
}