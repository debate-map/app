const fs = require("fs");
const paths = require("path");
const child_process = require("child_process");

exports.OpenFileExplorerToPath = path=>{
	if (process.platform === "win32") {
		child_process.exec(`start "" "${path}"`);
	} else {
		child_process.exec(`open "${path}"`);
	}
};
exports.WaitForEnterKeyThenExit = code=>{
	console.log("Press any key to exit...");
	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.on("data", ()=>process.exit(code));
};

exports.SetEnvVarsCmd = vars=>{
	const win32 = process.platform === "win32";
	let result = "";
	for (const [key, value] of Object.entries(vars)) {
		if (value == null) continue;
		result += win32 ? "set " : "export ";
		if (win32) {
			const escapeChar = '^';
			let string = `${value}`;
			result += `${key}=${string.replace(/([?*\/\\|"`><&])/g, `${escapeChar}$1`)}`;
		} else {
			result += `${key}=${value}`;
		}
	
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
exports.JSScript = (/** @type {{pkg: string, envStrAdd: string, tsConfigPath: string}} */ opts, scriptSubpath, ...args)=>{
	let cdCommand = "";
	if (opts.pkg) {
		if (opts.pkg == _packagesRootStr) {
			cdCommand = `cd Packages && `;
		} else {
			cdCommand = `cd Packages/${opts.pkg} && `;
		}
	}

	const nodeFlags = `--experimental-specifier-resolution=node`;
	return `${cdCommand}node ${nodeFlags} ${scriptSubpath} ${args.join(" ")}`;
};
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
// log the start and end times of scripts; this is useful for a variety of purposes (basic benchmarking, remembering precise time of command being run [vsc only shows estimate], etc.)
exports.SetUpLoggingOfScriptStartAndEndTimes = ()=>{
	const startTime = new Date();
	let timingLogsEnabled = true;
	let scriptStartTimePrinted = false;
	const PrintStartTimeIfNotYet = ()=>{
		if (scriptStartTimePrinted || !timingLogsEnabled) return;
		scriptStartTimePrinted = true;
		console.log(`Script start: ${startTime.toLocaleString("sv")}`);
	};

	let scriptEndTimePrinted = false;
	const PrintEndTimeIfNotYet = ()=>{
		if (scriptEndTimePrinted || !timingLogsEnabled) return;
		scriptStartTimePrinted = true; // we're also logging the start-time in this call, so interrupt timeout-based log of start-time (if still active)
		scriptEndTimePrinted = true;
		const endTime = new Date();
		const timeTaken = endTime.valueOf() - startTime.valueOf();
		console.log(`Script time:${(timeTaken / 1000).toFixed(3)}s @start:${startTime.toLocaleString("sv")} @end:${endTime.toLocaleString("sv")}`);
	};

	// log start-time 1s after startup, so early screenshot includes it (if script ends quickly, start-time gets shown only in end-time log)
	setTimeout(PrintStartTimeIfNotYet, 1000).unref(); // call unref, so timer doesn't keep script from exiting
	process.on("SIGINT", ()=>PrintEndTimeIfNotYet()); //process.exit(); });
	process.on("exit", ()=>PrintEndTimeIfNotYet());

	return {
		// some scripts need to block logging of start/end times (eg. if would disrupt reading of user typing/inputs)
		noTimings: ()=>{
			timingLogsEnabled = false;
		},
	};
};
exports.CurrentTime_SafeStr = ()=>new Date().toLocaleString("sv").replace(/[ :]/g, "-"); // ex: 2021-12-10-09-18-52

//console.log("Argv:", process.argv);
// process.argv example: ["XXX/node.exe", "XXX/nps.js", "app-server.initDB_k8s dm-ovh"]
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