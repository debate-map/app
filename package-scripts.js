const fs = require("fs");
const paths = require("path");
const {spawn, exec, execSync} = require("child_process");
const {_packagesRootStr, pathToNPMBin, TSScript, FindPackagePath, commandName, commandArgs, Dynamic, Dynamic_Async} = require("./Scripts/NPSHelpers.js");

const scripts = {};
module.exports.scripts = scripts;

Object.assign(scripts, {
	client: {
		tsc: `cd Packages/client && ${pathToNPMBin("tsc", 2)} --build --watch`,
		dev: {
			//default: `cross-env-shell NODE_ENV=development _USE_TSLOADER=true NODE_OPTIONS="--max-old-space-size=8192 --experimental-modules" "npm start dev-part2"`,
			default: GetServeCommand("development"),
			staticServe: GetServeCommand(), // same as above, except with NODE_ENV=null (for static-serving of files in Dist folder)
			noDebug: `nps "dev --no_debug"`,
			//part2: `cross-env TS_NODE_OPTIONS="--experimental-modules" ts-node-dev --project Scripts/tsconfig.json Scripts/Bin/Server.js`,
			//part2: `cross-env NODE_OPTIONS="--experimental-modules" ts-node --project Scripts/tsconfig.json Scripts/Bin/Server.js`,
			//part2: `cross-env ts-node-dev --project Scripts/tsconfig.json --ignore none Scripts/Bin/Server.js`,
			//part2: TSScript("client", "Scripts/Bin/Server"), // for now, call directly; no ts-node-dev [watching] till figure out use with new type:module approach
			part2: TSScript({pkg: _packagesRootStr}, "client/Scripts/Bin/Server"), // for now, call directly; no ts-node-dev [watching] till figure out use with new type:module approach

			//withStats: `cross-env-shell NODE_ENV=development _USE_TSLOADER=true OUTPUT_STATS=true NODE_OPTIONS="--max-old-space-size=8192 --experimental-modules" "ts-node-dev --project Scripts/tsconfig.json Scripts/Bin/Server"`,
			withStats: `cross-env-shell NODE_ENV=development _USE_TSLOADER=true OUTPUT_STATS=true NODE_OPTIONS="--max-old-space-size=8192" "ts-node-dev --project client/Scripts/tsconfig.json --ignore none client/Scripts/Bin/Server"`,
		},
		cypress: {
			open: "cd Packages/client && cypress open",
			run: "cd Packages/client && cypress run",
		},
		clean: "cd Packages/client && shx rm -rf Dist",
		compile: TSScript({pkg: "client"}, "Scripts/Bin/Compile"),
		build: {
			default: `cross-env-shell "npm start client.clean && npm start client.compile"`,
			dev: `cross-env NODE_ENV=development npm start client.build`,
			prod: `cross-env NODE_ENV=production npm start client.build`,
			prodQuick: `cross-env NODE_ENV=production QUICK=true npm start client.build`,
		},
		//justDeploy: 'ts-node ./Scripts/Build/Deploy',
		justDeploy: {
			dev: "TODO",
			prod: "TODO",
		},
		deploy: {
			dev: `cross-env-shell NODE_ENV=development _USE_TSLOADER=true "npm start client.build && npm start client.just-deploy.dev"`,
			prod: `cross-env-shell NODE_ENV=production "npm start client.build && npm start client.just-deploy.prod"`,
			prodQuick: `cross-env-shell NODE_ENV=production QUICK=true "npm start client.build && npm start client.just-deploy.prod"`,
		},

		//tscWatch: `./node_modules/.bin/tsc-watch.cmd --onSuccess "node ./Scripts/Build/OnSuccess.js"`,
	},
	common: {
		// helps for spotting typescript errors in the "Packages/common" (client.dev script can work too, but it's nice to have one just for errors in "common")
		// (not really useful anymore; just use app-server.dev instead)
		//tsc: "cd Packages/common && tsc --noEmit",
		tsc: "tsc --noEmit --project Packages/common/tsconfig.json", // must do this way, else tsc output has "../common" paths, which "$tsc-watch" problem-matcher resolves relative to repo-root
	},
});

const KubeCTLCmd = context=>`kubectl${context ? ` --context ${context}` : ""}`;
const GetPodNameCmd_DB =			contextName=>`${KubeCTLCmd(contextName)} get pod -o name -n postgres-operator -l postgres-operator.crunchydata.com/cluster=debate-map,postgres-operator.crunchydata.com/role=master`;
const GetPodNameCmd_WebServer =	contextName=>`${KubeCTLCmd(contextName)} get pod -o name -n app -l app=dm-web-server`;
const GetPodNameCmd_AppServer =	contextName=>`${KubeCTLCmd(contextName)} get pod -o name -n app -l app=dm-app-server`;

const PrepDockerCmd = ()=>{
	//return `npm start dockerPrep &&`;
	return `node Scripts/PrepareDocker.js &&`;
};

function GetServeCommand(nodeEnv = null) {
	return `cross-env-shell ${nodeEnv ? `NODE_ENV=${nodeEnv} ` : ""}_USE_TSLOADER=true NODE_OPTIONS="--max-old-space-size=8192" "npm start client.dev.part2"`;
}

const {nmWatchPaths} = require("./Scripts/NodeModuleWatchPaths.js");
Object.assign(scripts, {
	ssh: {
		"db": Dynamic(()=>{
			const podName = execSync(GetPodNameCmd_DB(commandArgs[0])).toString().trim();
			//console.log("podName:", podName);
			return `${KubeCTLCmd(commandArgs[0])} exec -ti -n postgres-operator ${podName} -c database -- bash`;
			/*const commandStr = `${KubeCTLCmd(commandArgs[0])} exec -ti -n postgres-operator ${podName} -c database -- bash`;
			spawn(commandStr.split(" ")[0], commandStr.split(" ").slice(1), {stdio: "inherit"});*/
		}),
		"web-server": Dynamic(()=>{
			const podName = execSync(GetPodNameCmd_WebServer(commandArgs[0])).toString().trim();
			return `${KubeCTLCmd(commandArgs[0])} exec -ti -n app ${podName} -c dm-web-server -- bash`;
		}),
		"app-server": Dynamic(()=>{
			const podName = execSync(GetPodNameCmd_AppServer(commandArgs[0])).toString().trim();
			return `${KubeCTLCmd(commandArgs[0])} exec -ti -n app ${podName} -c dm-app-server -- bash`;
		}),
	},
	// for scripts that are useful to multiple multiple backend packages (server, web-server, etc.)
	backend: {
		// general
		//buildNMOverwrites: `npx file-syncer ${group1} ${group2}`,
		buildNMOverwrites: `npx file-syncer --from ${nmWatchPaths.map(a=>`"${a}"`).join(" ")} --to NMOverwrites --replacements "node_modules/web-vcore/node_modules/" "node_modules/" --clearAtLaunch`,

		// docker
		dockerPrep: "node Scripts/PrepareDocker.js",
		//dockerBuild: "cross-env DOCKER_BUILDKIT=1 docker build -f ./Packages/app-server/Dockerfile -t dm-app-server-direct .",
		dockerBuild: `${PrepDockerCmd()} docker build -f ./Packages/app-server/Dockerfile -t dm-app-server-direct .`,
		//dockerBuild: "xcopy \"../../@Modules/web-vcore/Main/.yarn/cache\" \".yarn/cache2\" /s /e && docker build -f ./Packages/app-server/Dockerfile -t dm-app-server-direct .",
		// using robocopy works, but it's not much faster, if at all; seems slowdown is throughout the yarn install process (~3 minutes in docker, ~1s in Windows :/)
		//dockerBuild: "robocopy \"../../@Modules/web-vcore/Main/.yarn/cache\" \".yarn/cache2\" /s /e && docker build -f ./Packages/app-server/Dockerfile -t dm-app-server-direct .",
		//dockerBuild: "robocopy \"../../@Modules/web-vcore/Main/.yarn/cache\" \".yarn/cache2\" /s /e && docker build -f ./Packages/app-server/Dockerfile -t dm-app-server-direct .",
		//dockerBuild: "robocopy \"node_modules\" \".yarn/test1\" /s /e /NFL /NDL /NJH /NJS /nc /ns /np && docker build -f ./Packages/app-server/Dockerfile -t dm-app-server-direct .", // this takes even longer than yarn install...
		//dockerBuild: "tar -czh . | docker build -",
		dockerBuild_fullLog: `${PrepDockerCmd()} cross-env DOCKER_BUILDKIT=0 docker build -f ./Packages/app-server/Dockerfile -t dm-app-server-direct .`, // variant which preserves complete log (may increase build time)
		dockerBuild_ignoreCache: `${PrepDockerCmd()} docker build --no-cache -f ./Packages/app-server/Dockerfile -t dm-app-server-direct .`, // with cache disabled
		dockerBuild_gitlab: {
			"base": `${PrepDockerCmd()} docker build -f ./Packages/deploy/@DockerBase/Dockerfile -t registry.gitlab.com/venryx/debate-map .`,
			"app-server": `${PrepDockerCmd()} docker build -f ./Packages/app-server/Dockerfile -t registry.gitlab.com/venryx/debate-map .`,
			"web-server": `${PrepDockerCmd()} docker build -f ./Packages/web-server/Dockerfile -t registry.gitlab.com/venryx/debate-map .`,
		},
		pulumiUp: `${PrepDockerCmd()} pulumi up`,
		
		// commented; tilt doesn't recognize "local" context as local, so it then tries to actually deploy images to local.tilt.dev, which then fails
		tiltUp_local:	`${PrepDockerCmd()}		${SetTileEnvCmd(false, "local")}					tilt up --context local`,
		tiltUp_docker:	`${PrepDockerCmd()}		${SetTileEnvCmd(false, "docker-desktop")}		tilt up --context docker-desktop`,
		tiltUp_k3d:		`${PrepDockerCmd()}		${SetTileEnvCmd(false, "k3d-main-1")}			tilt up --context k3d-main-1`,
		tiltUp_kind:	`${PrepDockerCmd()}		${SetTileEnvCmd(false, "kind-main-1")}			tilt up --context kind-main-1`,
		tiltUp_ovh:		`${PrepDockerCmd()}		${SetTileEnvCmd(true, "ovh")}						tilt up --context ovh --port 10351`, // tilt-port +1, so can coexist with tilt dev-instance

		forceKillNS: Dynamic(()=>{
			const pathToKillScript = paths.resolve("./Scripts/KillKubeNS.sh");
			const pathToKillScript_wsl = pathToKillScript.replace(/\\/g, "/").replace("C:/", "/mnt/c/");
			return `wsl ${pathToKillScript_wsl} ${commandArgs.join(" ")}`;
		}),

		// backups
		viewDBBackups: Dynamic(()=>{
			const {bucket_uniformPrivate_name} = require("./PulumiOutput_Public.json");
			return `start "" "https://console.cloud.google.com/storage/browser/${bucket_uniformPrivate_name}/db-backups-pgbackrest/backup/db?project=debate-map-prod"`;
		}),
		makeDBBackup: Dynamic(()=>{
			const backupName = new Date().toISOString();
			return `kubectl annotate -n postgres-operator postgrescluster debate-map --overwrite postgres-operator.crunchydata.com/pgbackrest-backup="${backupName}"`;
		}),
	},
});
function SetTileEnvCmd(prod, context) {
	return `set TILT_WATCH_WINDOWS_BUFFER_SIZE=65536999&& ${prod ? "set ENV=prod&&" : "set ENV=dev&&"} ${context ? `set CONTEXT=${context}&&` : ""}`;
}

function GetSecretsInfo(context) {
	const secretsStr = execSync(`kubectl${context ? ` --context ${context}` : ""} get secrets -n postgres-operator debate-map-pguser-admin -o go-template='{{.data}}'`).toString();
	const keyValuePairs = secretsStr.match(/\[(.+)\]/)[1].split(" ").map(keyValPairStr=>keyValPairStr.split(":"));
	return {secretsStr, keyValuePairs};
}
function ImportPGUserSecretAsEnvVars(context) {
	const {keyValuePairs} = GetSecretsInfo(context);
	const fromBase64 = str=>Buffer.from(str, "base64");
	const GetEnvVal = name=>fromBase64(keyValuePairs.find(a=>a[0] == name)[1]);
	const newEnvVars = {
		// node-js flag
		NODE_TLS_REJECT_UNAUTHORIZED: 0, // tls change needed atm, till I figure out how to copy over signing data

		// app-level
		//DB_ADDR: GetEnvVal("host"),
		DB_ADDR: "localhost",
		//DB_PORT: GetEnvVal("port"),
		DB_PORT: context != "local" ? 4205 : 3205,
		DB_DATABASE: GetEnvVal("dbname"),
		DB_USER: GetEnvVal("user"),
		DB_PASSWORD: GetEnvVal("password"),
	};
	Object.assign(process.env, newEnvVars);
}

function GetKubectlContext() {
	return execSync(`kubectl config current-context`).toString().trim();
}

Object.assign(scripts, {
	"app-server": {
		// setup
		//initDB: "psql -f ./Packages/app-server/Scripts/InitDB.sql debate-map",
		//initDB: TSScript("app-server", "Scripts/InitDB.ts"),
		initDB: TSScript({pkg: "app-server"}, "Scripts/KnexWrapper.js", "initDB"),
		initDB_freshScript: `nps app-server.buildInitDBScript && nps app-server.initDB`,
		// k8s variants
		initDB_k8s: Dynamic(()=>{
			ImportPGUserSecretAsEnvVars(commandArgs[0] ?? GetKubectlContext());
			return `${pathToNPMBin("nps.cmd", 0, true, true)} app-server.initDB`;
		}),
		initDB_freshScript_k8s: Dynamic(()=>{
			ImportPGUserSecretAsEnvVars(commandArgs[0] ?? GetKubectlContext());
			return `${pathToNPMBin("nps.cmd", 0, true, true)} app-server.initDB_freshScript`;
		}),
		//migrateDBToLatest: TSScript("app-server", "Scripts/KnexWrapper.js", "migrateDBToLatest"),
		/*k8s_proxyOn8081: Dynamic(()=>{
			console.log("Test");
			return KubeCTLCommand(commandArgs[0], `-n postgres-operator port-forward $(${GetPodNameCmd_DB(commandArgs[0])}) 8081:5432`);
		}),*/
		// use this to dc sessions, so you can delete the debate-map db, so you can recreate it with the commands above
		dcAllDBSessions: `psql -c "
			SELECT pg_terminate_backend(pg_stat_activity.pid)
			FROM pg_stat_activity
			WHERE datname = "debate-map";"`,

		// db-shape and migrations
		buildInitDBScript: GetBuildInitDBScriptCommand(false),
		buildInitDBScript_watch: GetBuildInitDBScriptCommand(true),

		// first terminal
		//dev: "cd Packages/app-server && tsc --build --watch",
		dev: "tsc --build --watch Packages/app-server/tsconfig.json", // must do this way, else tsc output has "../common" paths, which "$tsc-watch" problem-matcher resolves relative to repo-root

		// second terminal
		run: GetStartServerCommand(),
	},
	"web-server": {
		dev: "tsc --build --watch Packages/web-server/tsconfig.json",

		dockerBuild: `${PrepDockerCmd()} docker build -f ./Packages/web-server/Dockerfile -t dm-web-server-direct .`,
		dockerBuild_fullLog: `${PrepDockerCmd()} cross-env DOCKER_BUILDKIT=0 docker build -f ./Packages/web-server/Dockerfile -t dm-web-server-direct .`, // variant which preserves complete log (may increase build time)
		dockerBuild_ignoreCache: `${PrepDockerCmd()} docker build --no-cache -f ./Packages/web-server/Dockerfile -t dm-web-server-direct .`, // with cache disabled
	},
});

function GetBuildInitDBScriptCommand(watch) {
	return TSScript({pkg: "app-server"}, `${FindPackagePath("mobx-graphlink")}/Scripts/BuildInitDBScript.ts`,
		`--classFolders ../../Packages/common/Source/DB ${paths.join(FindPackagePath("graphql-feedback"), "Source/Store/db")}`,
		`--templateFile ./Scripts/InitDB_Template.ts`,
		`--outFile ./Scripts/InitDB_Generated.ts`,
		watch ? "--watch" : "");
}

// if server-start command/flags change, update the entry in "launch.json" as well
function GetStartServerCommand() {
	//return TSScript("app-server", "Source/Main.ts");
	// use TSScript helper for its module-resolution flags (not used for TS->JS transpilation)
	//return TSScript({pkg: "app-server", envStrAdd: "DEV=true"}, "Dist/Main.js");

	return `cd Packages/app-server && node --experimental-specifier-resolution=node ./Dist/Main.js`;
}