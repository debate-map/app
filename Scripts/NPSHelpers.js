const fs = require("fs");
const paths = require("path");

exports.SetEnvVarsCmd = vars=>{
	const win32 = process.platform === "win32";
	let result = "";
	for (const [key, value] of Object.entries(vars)) {
		if (value == null) continue;
		result += win32 ? "set " : "export ";
		result += `${key}=${value}`;
		result += win32 ? "&& " : " && "; // yes, windows command-line is weird (space before the "&&" would be interpreted as part of previous env-var's value)
	}
	if (result.length > 0) result = result.slice(0, -1); // remove final space
	return result;
};

exports.pathToNPMBin = (binaryName, depth = 0, normalize = true, abs = false)=>{
	let path = `./node_modules/.bin/${binaryName}`;
	for (let i = 0; i < depth; i++) {
		path = `../${path}`;
	}
	if (normalize) path = paths.normalize(path);
	if (abs) path = paths.resolve(path);
	return path;
};

const _packagesRootStr = exports._packagesRootStr = "{packagesRoot}"; // useful for setting working-directory to "./Packages/", eg. so when running webpack, its error paths are "resolvable" by vscode window #1
exports.TSScript = (/** @type {{pkg: string, envStrAdd: string, tsConfigPath: string}} */ opts, scriptSubpath, ...args)=>{
	let cdCommand = "";
	let tsConfigPath = "";
	if (opts.pkg) {
		if (opts.pkg == _packagesRootStr) {
			cdCommand = `cd Packages && `;
			tsConfigPath = "client/Scripts/tsconfig.json";
		} else {
			cdCommand = `cd Packages/${opts.pkg} && `;
			tsConfigPath = "Scripts/tsconfig.json";
		}
	}
	if (opts.tsConfigPath) {
		tsConfigPath = opts.tsConfigPath;
	}

	const envPart = `TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=${tsConfigPath} TS_NODE_TRANSPILE_ONLY=true ${opts.envStrAdd ?? ""}`;
	const nodeFlags = `--loader ts-node/esm.mjs --experimental-specifier-resolution=node`;
	return `${cdCommand}cross-env ${envPart} node ${nodeFlags} ${scriptSubpath} ${args.join(" ")}`;
};
exports.FindPackagePath = (packageName, asAbsolute = true)=>{
	const pathsToCheck = [
		`./node_modules/web-vcore/node_modules/${packageName}`, // if web-vcore is symlinked
		`./node_modules/${packageName}`, // if web-vcore is not symlinked
	];
	for (const path of pathsToCheck) {
		if (fs.existsSync(path)) {
			return asAbsolute ? paths.resolve(path) : path;
		}
	}
	throw new Error(`Could not find package: "${packageName}"`);
};

//console.log("Argv:", process.argv);
// process.argv example: ["XXX/node.exe", "XXX/nps.js", "app-server.initDB_k8s ovh"]
const commandNameAndArgs = process.argv[2];
const argsStr_start = commandNameAndArgs.includes(" ") ? commandNameAndArgs.indexOf(" ") : null;
exports.commandName = argsStr_start != null ? commandNameAndArgs.slice(0, argsStr_start) : commandNameAndArgs;
exports.commandArgs = argsStr_start != null ? commandNameAndArgs.slice(argsStr_start).trimStart().split(" ") : [];

// monkey-patch needed for Dynamic() function below
const join_orig = Array.prototype.join;
Array.prototype.join = function(...args) {
	// Here is the relevant location in the nps source code: https://github.com/sezna/nps/blob/57989a24ff6876b3d5245f7e00b76aaf39296d31/src/index.js#L59
	// If we're concatenating the script-entry with its args (just before execution)...
	//	...and we find a String object produced by the Dynamic function above (rather than a primitive string like normal)...
	//	...then intercept and replace the String object with the result of its commandStrGetter().
	if (this[0] instanceof String && this[0].commandStrGetter != null) {
		this[0] = this[0].commandStrGetter();
		this.length = 1; // also chop off any arguments (we are already handling the arguments through the commandArgs variable in this package-scripts.js)
	}
	return join_orig.apply(this, args);
};
exports.Dynamic = commandStrGetter=>{
	const result = new String("[placeholder for dynamically-evaluated command-string]");
	result.commandStrGetter = commandStrGetter;
	return result;
};
exports.Dynamic_Async = asyncCommandRunnerFunc=>{
	return Dynamic(()=>{
		asyncCommandRunnerFunc();
		// just return an empty command
	});
};