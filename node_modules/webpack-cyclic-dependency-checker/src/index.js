const path = require("path");

// Convert webpack stats.json input, which looks something like:
// {
//   modules: [
//     id: 1,
//     reasons: [{name: "./path/to/module", moduleId: 2}]
//   ]
// }
// into a graph: (parent module -> child/required module)
// {
//   2: [1]
// }
// Essentially grouping it by requirer, not by required file.
function GetModuleInfosFromStats(stats, includeNodeModules) {
	// remove all required modules that are node_modules if specified
	const modules = includeNodeModules ? stats.modules : stats.modules.filter(m=>!IsNodeModulePath(m.name));

	let moduleInfos = {};
	for (let module of modules) {
		for (let reason of module.reasons) {
			let parentID = reason.moduleId;
			// Ignore parent/caller modules that are in node_modules. This likely is impossible because it would mean a node_module includes a userland script.
			if (!includeNodeModules && IsNodeModulePath(parentID.toString())) continue;

			let moduleInfo = moduleInfos[parentID] || (moduleInfos[parentID] = {dependencies: []});
			let parent = modules.find(a=>a.id == parentID);
			moduleInfo.name = parent ? parent.name : moduleInfo.name;
			moduleInfo.dependencies.push(module.id);
		}
	}
	return moduleInfos;
}

// if module is from node_modules, the path will contain either "node_modules" or the tilde string
function IsNodeModulePath(path) {
    return path == null || path.includes("node_modules") || path.includes("./~/");
    //return path == null || path.indexOf("node_modules") != -1 || path.indexOf("./~/") != -1;
}

// Recursively search a module's dependencies for cycles. (we externally-call this once for each module, with it as the initial module)
/*function FindCycles(dependencyGraph, pathNodesSoFar, seenModules = {}) {
	let currentModuleID = pathNodesSoFar[pathNodesSoFar.length - 1];
	seenModules[currentModuleID] = {};

	let childIDs = dependencyGraph[currentModuleID] || [];
	let result = [];
	for (let childID of childIDs) {
		if (childID in seenModules) {
			if (childID != pathNodesSoFar[0]) continue; // cyclic, but not for the current module
			return [pathNodesSoFar.concat(childID)];
		}
		
		let cyclesOnSubpath = FindCycles(dependencyGraph, pathNodesSoFar.concat(childID), seenModules);
		result.push(...cyclesOnSubpath);
	}
	return result;
}*/

function FindCycles(moduleInfo, pathNodesSoFar, shortestPathsFromInitialToX = {}) {
	let initialModuleID = pathNodesSoFar[0];
	let currentModuleID = pathNodesSoFar[pathNodesSoFar.length - 1];

	let childIDs = moduleInfo[currentModuleID] ? moduleInfo[currentModuleID].dependencies : [];
	let result = [];
	for (let childID of childIDs) {
		let pathForChild = pathNodesSoFar.concat(childID);
		// if found cycle back to the initial module
		if (childID == initialModuleID) return [pathForChild];

		let currentShortestPath = shortestPathsFromInitialToX[childID];
		if (currentShortestPath == null || pathForChild.length < currentShortestPath.length) {
			shortestPathsFromInitialToX[childID] = pathForChild;
		}
		// if we've already traversed into this child, don't do so again
		if (currentShortestPath) continue;

		let cyclesOnSubpath = FindCycles(moduleInfo, pathForChild, shortestPathsFromInitialToX);
		result.push(...cyclesOnSubpath);
	}

	// if giving final results
	if (pathNodesSoFar.length == 1) {
		return result.map(path=> {
			return shortestPathsFromInitialToX[path.slice(-2)[0]].concat(initialModuleID);
		});
	}

	return result;
}

function CyclicDependencyChecker(options) {
	/*this.options = extend({
		exclude: new RegExp('$^'),
		failOnError: false
	}, options);*/
}
CyclicDependencyChecker.prototype.apply = function(compiler) {
	var plugin = this;
	
	compiler.plugin("done", function(stats) {
		let moduleInfos = {};
		for (let module of stats.compilation.modules) {
			//if (!module.resource) continue;
			//if (module.dependencies == null) continue;
			let moduleInfo = {};
			//moduleInfo.name = module.name;
			if (module.resource) {
				moduleInfo.name = path.relative(process.cwd(), module.resource).replace(/\\/g, "/");
			}
			if (module.dependencies) {
				moduleInfo.dependencies = module.dependencies.filter(a=>a.module).map(a=>a.module.id);
			}
			moduleInfos[module.id] = moduleInfo;
		}
		//fs.writeFile(`./Tools/Webpack Profiling/ModuleInfo.json`, JSON.stringify(moduleInfos));

		LogCycles(moduleInfos);
	});
}

function LogCycles(moduleInfos) {
	const namePadToLength = 20;

	let cycles = [];
	for (let moduleID in moduleInfos) {
		let moduleCycles = FindCycles(moduleInfos, [moduleID]);
		cycles.push(...moduleCycles);
	}

	/*console.log("Total cycles found: " + cycles.length);
	console.log("\n");*/

	console.log("\n");
	console.log("Cycles:");

	let maxIndexStrLength = (cycles.length + 1).toString().length;
	for (let [index, cycle] of cycles.entries()) {
		let cycle_names = cycle.map(moduleID2=> {
			let path = (moduleInfos[moduleID2] || {}).name || `(${moduleID2})`;
			// simplify path to just the file-name (without extension)
			path = path.substring(path.lastIndexOf("/") + 1, path.lastIndexOf("."));
			if (path.length < namePadToLength) path += " ".repeat(namePadToLength - path.length);
			return path;
		});
		let cycleStr = cycle_names.join("");
		let indexStr = (index + 1).toString();
		if (indexStr.length < maxIndexStrLength) indexStr = " ".repeat(maxIndexStrLength - indexStr.length) + indexStr;
		console.log(`${indexStr}: ${cycleStr}`);
	}
	
	console.log("\n");
}

module.exports = {
    GetModuleInfosFromStats,
    FindCycles,
	 CyclicDependencyChecker,
	 LogCycles,
};