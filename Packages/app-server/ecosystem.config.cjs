//const nodeModuleWatchPaths = require("../../Scripts/NodeModuleWatchPaths.js").nmWatchPaths_notUnderWVC;
//console.log("Contents of /dm_repo/node_modules/zen-observable-ts/package.json:", require("fs").readFileSync("/dm_repo/node_modules/zen-observable-ts/package.json").toString());

const DEV = process.env.ENV == "dev";
const k8sServiceHost = process.env.KUBERNETES_SERVICE_HOST;
const inLocalK8s = DEV;
if (inLocalK8s) {
	process.env.NEW_RELIC_APP_NAME = "app-server-dev";
}
console.log("Preparing to run app-server. @devMode:", DEV, "@serverHost:", k8sServiceHost, "@inLocalK8s:", inLocalK8s);

const nodeArgs = [
	`--experimental-specifier-resolution=node`,
	//`--heapsnapshot-near-heap-limit=3`,
	//`--inspect`,
	`--max-old-space-size=8192`,
];
module.exports = {
	apps: [{
		name: "main",

		// sleep a few seconds before starting; kinda ugly, but only way I know atm to keep pm2 from cutting off the start of the logs, for the first run after pod-deployment
		script: `echo sleep0; sleep 1; echo sleep1; sleep 1; echo sleep2; sleep 1; echo sleep3; node ${nodeArgs.join(" ")} ./Dist/Main.js`,
		interpreter: null,

		autorestart: false,

		//watch: true, // watch:true doesn't work fsr (it ignores node_modules)
		/*watch: [
			"Packages/app-server",
			...nodeModuleWatchPaths,
		],*/
		watch: "**",
		watch_options: {
			cwd: "/dm_repo",
		},
		ignore: null,
		// this is claimed to be regex-based (https://pm2.keymetrics.io/docs/usage/application-declaration), but appears to actually be blob-based
		ignore_watch: [
			"**/newrelic_agent.log",
		],
	}],
};