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

		exp_backoff_restart_delay: 500,

		watch: [
			"Packages/server",
			...nodeModuleWatchPaths,
		],
		ignore: null,
		ignore_watch: [],
		watch_options: {
			cwd: '/dm_server',
		},
		
		/*env_production: {
			NODE_ENV: "production"
		},
		env_development: {
			NODE_ENV: "development"
		}*/
	}],
};