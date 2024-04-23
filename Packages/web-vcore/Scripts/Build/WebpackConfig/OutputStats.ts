import depTools from "webpack-dependency-tools";
import fs from "fs";
import webpack from "webpack";

const {CyclicDependencyChecker} = depTools;

export function MakeSoWebpackConfigOutputsStats(config: webpack.Configuration) {
	let firstOutput = true;
	config.plugins!.push({
		apply(compiler) {
			compiler.hooks.afterEmit.tap("OutputStats", compilation=>{
				const stats = compilation.getStats().toJson({
					hash: false,
					version: false,
					timings: true,
					assets: false,
					chunks: false,
					chunkModules: false,
					chunkOrigins: false,
					modules: true,
					cached: false,
					reasons: true,
					children: false,
					source: false,
					errors: false,
					errorDetails: false,
					warnings: false,
					publicPath: false,
				});
				fs.writeFile(`./Tools/Webpack Profiling/Stats${firstOutput ? "" : "_Incremental"}.json`, JSON.stringify(stats), ()=>{});

				let modules_justTimings = stats.modules.map(mod=>{
					const timings = mod.profile;
					return {
						name: mod.name,
						totalTime: (timings.factory | 0) + (timings.building | 0) + (timings.dependencies | 0),
						timings,
					};
				});
				modules_justTimings = SortArrayDescending(modules_justTimings, a=>a.totalTime);

				const modules_justTimings_asMap = {};
				for (const mod of modules_justTimings) {
					modules_justTimings_asMap[mod.name] = mod;
					delete mod.name;
				}
				fs.writeFile(`./Tools/Webpack Profiling/ModuleTimings${firstOutput ? "" : "_Incremental"}.json`, JSON.stringify(modules_justTimings_asMap, null, 2), ()=>{});

				firstOutput = false;
			});

			// uncomment this to output the module-info that can be used later to see cyclic-dependencies, using AnalyzeDependencies.bat
			/* compiler.plugin("done", function(stats) {
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
				fs.writeFile(`./Tools/Webpack Profiling/ModuleInfo.json`, JSON.stringify(moduleInfos));
			}); */
		},
	});

	/* let CircularDependencyPlugin = require("circular-dependency-plugin");
	webpackConfig.plugins.push(
		new CircularDependencyPlugin({exclude: /node_modules/})
	); */

	config.plugins!.push(
		new CyclicDependencyChecker(),
	);

	config.profile = true;
	config.stats = "verbose";
}

function SortArray(array, valFunc = (item, index)=>item) {
	return StableSort(array, (a, b, aIndex, bIndex)=>Compare(valFunc(a, aIndex), valFunc(b, bIndex)));
}
function SortArrayDescending(array, valFunc = (item, index)=>item) {
	return SortArray(array, (item, index)=>-valFunc(item, index));
}
function StableSort(array, compareFunc) { // needed for Chrome
	const array2 = array.map((item, index)=>({index, item}));
	array2.sort((a, b)=>{
		const r = compareFunc(a.item, b.item, a.index, b.index);
		return r != 0 ? r : Compare(a.index, b.index);
	});
	return array2.map(pack=>pack.item);
}
function Compare(a, b, caseSensitive = true) {
	if (!caseSensitive && typeof a == "string" && typeof b == "string") {
		a = a.toLowerCase();
		b = b.toLowerCase();
	}
	return a < b ? -1 : (a > b ? 1 : 0);
}

/* function WithDeepSet(baseObj, pathOrPathSegments, newValue, sepChar = "/") {
	let pathSegments = pathOrPathSegments instanceof Array ? pathOrPathSegments : pathOrPathSegments.split(sepChar);
	return {
		...baseObj,
		[pathSegments[0]]: pathSegments.length > 1 ? WithDeepSet(baseObj[pathSegments[0]], pathSegments.slice(1), newValue) : newValue,
	};
} */