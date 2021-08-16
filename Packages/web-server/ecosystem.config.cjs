//const nodeModuleWatchPaths = require("../../Scripts/NodeModuleWatchPaths.js").nmWatchPaths_notUnderWVC;

const DEV = process.env.DEV == "true";
const k8sServiceHost = process.env.KUBERNETES_SERVICE_HOST;
const inLocalK8s = DEV;
console.log("Preparing to run web-server. @devMode:", DEV, "@serverHost:", k8sServiceHost, "@inLocalK8s:", inLocalK8s);
//console.log("Env:", process.env);

module.exports = {
	apps: [{
		name: "main",

		...DEV ? {
			//script: "node --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js; sleep infinity", // sleep forever after, so if errors, kubernetes doesn't instantly restart it
			script: "node --experimental-specifier-resolution=node ./Dist/Main.js; sleep infinity", // sleep forever after, so if errors, kubernetes doesn't instantly restart it
			interpreter: null,
		} : {
			script: "./Dist/Main.js",
			//node_args: "--loader ts-node/esm.mjs --experimental-specifier-resolution=node",
			node_args: "--experimental-specifier-resolution=node",
		},

		//exp_backoff_restart_delay: 500,
		// disable restart-on-error (that's kubernetes' job);
		//stop_exit_codes: [0],
		stop_exit_codes: (()=>{
			const result = [0];
			result.includes = ()=>true; // have pm2 view *every* exit-code as a "stop"/to-ignore one
			return result;
		})(),

		//watch: true, // watch:true doesn't work fsr (it ignores node_modules)
		// disable watching in remote k8s instances, because not all support it (eg. ovh)
		watch: inLocalK8s ? "**" : false,
		/*watch: [
			"Packages/web-server",
			"Packages/client/Source_JS",
			"Packages/common/Dist",
			...nodeModuleWatchPaths,
		],*/
		ignore: null,
		ignore_watch: [],
		watch_options: {
			cwd: '/dm_repo',
		},
		
		/*env_production: {
			NODE_ENV: "production"
		},
		env_development: {
			NODE_ENV: "development"
		}*/
	}],
};