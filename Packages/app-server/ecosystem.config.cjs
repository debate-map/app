const DEV = process.env.ENV == "dev";
const k8sServiceHost = process.env.KUBERNETES_SERVICE_HOST;
const inLocalK8s = DEV;
process.env.NEW_RELIC_APP_NAME = `app-server${inLocalK8s ? "-dev" : ""}`;
console.log("Preparing to run app-server. @devMode:", DEV, "@serverHost:", k8sServiceHost, "@inLocalK8s:", inLocalK8s);

module.exports = {
	apps: [{
		name: "main",

		// sleep a few seconds before starting; kinda ugly, but only way I know atm to keep pm2 from cutting off the start of the logs, for the first run after pod-deployment
		script: `echo sleep0; sleep 1; echo sleep1; sleep 1; echo sleep2; sleep 1; echo sleep3; app-server.exe`,
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