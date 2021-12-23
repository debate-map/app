//const nodeModuleWatchPaths = require("../../Scripts/NodeModuleWatchPaths.js").nmWatchPaths_notUnderWVC;

const DEV = process.env.ENV == "dev";
const k8sServiceHost = process.env.KUBERNETES_SERVICE_HOST;
const inLocalK8s = DEV;
console.log("Preparing to run web-server. @devMode:", DEV, "@serverHost:", k8sServiceHost, "@inLocalK8s:", inLocalK8s);

const nodeArgs = [
	`--experimental-specifier-resolution=node`,
	//`--heapsnapshot-near-heap-limit=3`,
	//`--inspect`,
];
module.exports = {
	apps: [{
		name: "main",

		// sleep a few seconds before starting; kinda ugly, but only way I know atm to keep pm2 from cutting off the start of the logs, for the first run after pod-deployment
		script: `echo sleep0; sleep 1; echo sleep1; sleep 1; echo sleep2; sleep 1; echo sleep3; sleep 1; echo sleep4; sleep 1; echo sleep5; node ${nodeArgs.join(" ")} ./Dist/Main.js`,
		interpreter: null,

		autorestart: false,

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