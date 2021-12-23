//const nodeModuleWatchPaths = require("../../Scripts/NodeModuleWatchPaths.js").nmWatchPaths_notUnderWVC;

const DEV = process.env.ENV == "dev";
const k8sServiceHost = process.env.KUBERNETES_SERVICE_HOST;
const inLocalK8s = DEV;
console.log("Preparing to run app-server. @devMode:", DEV, "@serverHost:", k8sServiceHost, "@inLocalK8s:", inLocalK8s);
//console.log("Env:", process.env);

//console.log("Contents of /dm_repo/node_modules/zen-observable-ts/package.json:", require("fs").readFileSync("/dm_repo/node_modules/zen-observable-ts/package.json").toString());

// todo: integrate the improvements in this file into the web-server's ecosystem.config.cjs file as well

const nodeArgs = [
	`--experimental-specifier-resolution=node`,
	`--heapsnapshot-near-heap-limit=3`,
	//`--inspect`,
];
//console.log("Updated2!");

module.exports = {
	apps: [{
		name: "main",

		/*...DEV ? {
			//script: "node --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js; sleep infinity", // sleep forever after, so if errors, kubernetes doesn't instantly restart it
			script: `node ${nodeArgs.join(" ")} ./Dist/Main.js; sleep infinity`, // sleep forever after, so if errors, kubernetes doesn't instantly restart it
			interpreter: null,
		} :
		{
			script: "./Dist/Main.js",
			//node_args: "--loader ts-node/esm.mjs --experimental-specifier-resolution=node",
			node_args: nodeArgs.join(" "),
		},*/

		// new way (this way doesn't leave out the first part of the program's logs)
		// sleep two seconds before starting; kinda ugly, but only way I know atm to keep pm2 from cutting off the start of the logs, for the first run after pod-deployment
		script: `echo sleep0; sleep 1; echo sleep1; sleep 1; echo sleep2; node ${nodeArgs.join(" ")} ./Dist/Main.js`,
		interpreter: null,

		// disable restart-on-error (that's kubernetes' job);
		/*//stop_exit_codes: [0],
		stop_exit_codes: (()=>{
			const result = [0];
			// have pm2 view *every* exit-code as a "stop"/to-ignore one (other than 42; that's our restart code in app-server/Main.ts)
			result.includes = stopCodeFound=>stopCodeFound != 42;
			return result;
		})(),
		// temp; the stop_exit_codes solution doesn't seem to work for every case, so use back-off on retries at least
		exp_backoff_restart_delay: 500,*/
		autorestart: false,
		//max_restarts: 0,

		//watch: true, // watch:true doesn't work fsr (it ignores node_modules)
		// disable watching in remote k8s instances, because not all support it (eg. ovh)
		//watch: inLocalK8s ? "**" : false,
		watch: "**",
		/*watch: [
			"Packages/app-server",
			...nodeModuleWatchPaths,
		],*/
		ignore: null,
		// this is regex-based, according to: https://pm2.keymetrics.io/docs/usage/application-declaration/
		ignore_watch: [
			"Packages/app-server/newrelic_agent.log",
		],
		watch_options: {
			cwd: "/dm_repo",
		},

		/*env_production: {
			NODE_ENV: "production"
		},
		env_development: {
			NODE_ENV: "development"
		}*/
	}],
};