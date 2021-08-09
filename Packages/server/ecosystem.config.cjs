/*const fs = require("fs");
const dockerIgnore_str = fs.readFileSync("../../.dockerignore").toString();
const dockerIgnore_lines = dockerIgnore_str.split("\n");
const nodeModuleWatchPathLines = dockerIgnore_lines.slice(
	dockerIgnore_lines.findIndex(a=>a.includes("START NODE_MODULES WATCH PATHS")) + 1,
	dockerIgnore_lines.findIndex(a=>a.includes("END NODE_MODULES WATCH PATHS")),
).filter(a=>!a.startsWith("#"));
const nodeModuleWatchPaths = nodeModuleWatchPathLines.map(a=>a.slice(1)); // remove the "!" at the start*/
const nodeModuleWatchPaths = require("../../Scripts/NodeModuleWatchPaths.js").default;

module.exports = {
	apps: [{
		name: "main",
		script: "./Dist/Main.js",
		node_args: "--loader ts-node/esm.mjs --experimental-specifier-resolution=node",

		/*watch: true,
		ignore_watch: [],
		watch_options: {
			cwd: '../../', // cwd is "Packages/server" folder, so move up to monorepo-root
		},*/

		watch: [
			"Packages/server",
			/*"node_modules/web-vcore/nm/*",
			"node_modules/web-vcore/nm/**",
			"node_modules/web-vcore/nm/js-vextensions.js",*/
			...nodeModuleWatchPaths,
		],
		ignore: null,
		ignore_watch: ["*.log"],
		watch_options: {
			persistent: true,

			ignored: '*.txt',
			ignoreInitial: false,
			followSymlinks: true,
			cwd: '/dm_server',
			disableGlobbing: false,

			usePolling: false,
			interval: 100,
			binaryInterval: 300,
			alwaysStat: false,
			depth: 99,
			awaitWriteFinish: {
				stabilityThreshold: 2000,
				pollInterval: 100
			},

			ignorePermissionErrors: false,
			atomic: true // or a custom 'atomicity delay', in milliseconds (default 100)
		},
		
		/*env_production: {
			NODE_ENV: "production"
		},
		env_development: {
			NODE_ENV: "development"
		}*/
	}],
};