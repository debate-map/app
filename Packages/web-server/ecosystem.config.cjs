const nodeModuleWatchPaths = require("../../Scripts/NodeModuleWatchPaths.js").default;

module.exports = {
	apps: [{
		name: "main",
		script: "./Dist/Main.js",
		node_args: "--loader ts-node/esm.mjs --experimental-specifier-resolution=node",

		exp_backoff_restart_delay: 500,

		watch: [
			"Packages/web-server",
			"Packages/client/Source_JS",
			"Packages/common/Dist",
			...nodeModuleWatchPaths,
		],
		ignore: null,
		ignore_watch: [],
		watch_options: {
			cwd: '/dm_web-server',
		},
		
		/*env_production: {
			NODE_ENV: "production"
		},
		env_development: {
			NODE_ENV: "development"
		}*/
	}],
};