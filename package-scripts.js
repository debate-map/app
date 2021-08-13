const fs = require("fs");
const paths = require("path");

/*
Why are some scripts '.ts' and some '.js'?
Well, the default is '.js', because it makes scripts easier to use in 'one off' terminal runs. (and usable by 'runtime' codebases, eg. Packages/web-server)
However, if there are enough useful type-notations in a file, it's also okay to use '.ts'. In that case, set up an entry in this file, using the TSScript() helper.
*/

const _packagesRootStr = "{packagesRoot}"; // useful for setting working-directory to "./Packages/", eg. so when running webpack, its error paths are "resolvable" by vscode window #1
function TSScript(/** @type {{pkg: string, envStrAdd: string}} */ opts, scriptSubpath, ...args) {
	let cdCommand = "";
	let tsConfigPath = "";
	if (opts.pkg) {
		if (opts.pkg == _packagesRootStr) {
			cdCommand = `cd Packages && `;
			tsConfigPath = "client/Scripts/tsconfig.json";
		} else {
			cdCommand = `cd Packages/${opts.pkg} && `;
			tsConfigPath = "Scripts/tsconfig.json";
		}
	}

	const envPart = `TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=${tsConfigPath} TS_NODE_TRANSPILE_ONLY=true ${opts.envStrAdd ?? ""}`;
	const nodeFlags = `--loader ts-node/esm.mjs --experimental-specifier-resolution=node`;
	return `${cdCommand}cross-env ${envPart} node ${nodeFlags} ${scriptSubpath} ${args.join(" ")}`;
}
function FindPackagePath(packageName, asAbsolute = true) {
	const pathsToCheck = [
		`./node_modules/web-vcore/node_modules/${packageName}`, // if web-vcore is symlinked
		`./node_modules/${packageName}`, // if web-vcore is not symlinked
	];
	for (const path of pathsToCheck) {
		if (fs.existsSync(path)) {
			return asAbsolute ? paths.resolve(path) : path;
		}
	}
	throw new Error(`Could not find package: "${packageName}"`);
}

//const memLimit = 4096;
const memLimit = 8192; // in megabytes

const scripts = {};
module.exports.scripts = scripts;

let setk8sEnvVars_commandStr;
try {
	const child_process = require("child_process");
	// secretsStr is a text string like the below (except with SOME_STR being the value in base64)
	//map[dbname:SOME_STR host:SOME_STR password:SOME_STR port:SOME_STR uri:SOME_STR user:SOME_STR verifier:SOME_STR]
	const secretsStr = child_process.execSync("kubectl get secrets -n dm-pg-operator debate-map-pguser-admin -o go-template='{{.data}}'").toString();
	const keyValuePairs = secretsStr.match(/\[(.+)\]/)[1].split(" ").map(keyValPairStr=>keyValPairStr.split(":"));
	// from: Packages/server/deployment.yaml
	const envMapping = {
		host: "DB_ADDR",
		port: "DB_PORT",
		dbname: "DB_DATABASE",
		user: "DB_USER",
		password: "DB_PASSWORD",
	};
	const fromBase64 = str=>Buffer.from(str, "base64");
	setk8sEnvVars_commandStr = `cross-env ${keyValuePairs.map(pair=>{
		let key = pair[0];
		let endKey = envMapping[pair[0]];
		let val = fromBase64(pair[1]);
		if (key == "host") val = "localhost";
		//if (key == "port") val = "8081";
		if (key == "port") val = "3205";
		return `${endKey}="${val}"`;
	}).join(" ")} NODE_TLS_REJECT_UNAUTHORIZED='0' `; // tls change needed atm, till I figure out how to copy over signing data
	console.log("CommandStr345:", setk8sEnvVars_commandStr);
} catch (ex) {
	// ignore error; can be just when k8s hasn't been set up yet
	setk8sEnvVars_commandStr = `[command-prep error: ${ex}]`
}

function GetServeCommand(nodeEnv = null) {
	return `cross-env-shell ${nodeEnv ? `NODE_ENV=${nodeEnv} ` : ""}_USE_TSLOADER=true NODE_OPTIONS="--max-old-space-size=${memLimit}" "npm start client.dev.part2"`;
}

/*const {nmWatchPaths_notUnderWVC, nmWatchPaths_underWVC} = require("./Scripts/NodeModuleWatchPaths.js");
const group1 = `--from ${nmWatchPaths_notUnderWVC.map(a=>`"${a}"`).join(" ")} --to NMOverwrites`;
const group2 = `--from-2 ${nmWatchPaths_underWVC.map(a=>`"${a.replace("node_modules/web-vcore/", "")}"`).join(" ")} --to-2 NMOverwrites`;*/
const {nmWatchPaths} = require("./Scripts/NodeModuleWatchPaths.js");

Object.assign(scripts, {
	client: {
		tsc: `cd Packages/client && ${paths.normalize("../../node_modules/.bin/tsc")} --build --watch`,
		dev: {
			//default: `cross-env-shell NODE_ENV=development _USE_TSLOADER=true NODE_OPTIONS="--max-old-space-size=${memLimit} --experimental-modules" "npm start dev-part2"`,
			default: GetServeCommand("development"),
			staticServe: GetServeCommand(), // same as above, except with NODE_ENV=null (for static-serving of files in Dist folder)
			noDebug: `nps "dev --no_debug"`,
			//part2: `cross-env TS_NODE_OPTIONS="--experimental-modules" ts-node-dev --project Scripts/tsconfig.json Scripts/Bin/Server.js`,
			//part2: `cross-env NODE_OPTIONS="--experimental-modules" ts-node --project Scripts/tsconfig.json Scripts/Bin/Server.js`,
			//part2: `cross-env ts-node-dev --project Scripts/tsconfig.json --ignore none Scripts/Bin/Server.js`,
			//part2: TSScript("client", "Scripts/Bin/Server"), // for now, call directly; no ts-node-dev [watching] till figure out use with new type:module approach
			part2: TSScript({pkg: _packagesRootStr}, "client/Scripts/Bin/Server"), // for now, call directly; no ts-node-dev [watching] till figure out use with new type:module approach

			//withStats: `cross-env-shell NODE_ENV=development _USE_TSLOADER=true OUTPUT_STATS=true NODE_OPTIONS="--max-old-space-size=${memLimit} --experimental-modules" "ts-node-dev --project Scripts/tsconfig.json Scripts/Bin/Server"`,
			withStats: `cross-env-shell NODE_ENV=development _USE_TSLOADER=true OUTPUT_STATS=true NODE_OPTIONS="--max-old-space-size=${memLimit}" "ts-node-dev --project client/Scripts/tsconfig.json --ignore none client/Scripts/Bin/Server"`,
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
		// (not really useful anymore; just use server.dev instead)
		//tsc: "cd Packages/common && tsc --noEmit",
		tsc: "tsc --noEmit --project Packages/common/tsconfig.json", // must do this way, else tsc output has "../common" paths, which "$tsc-watch" problem-matcher resolves relative to repo-root
	},
	// for scripts that are useful to multiple multiple backend packages (server, web-server, etc.)
	backend: {
		// general
		//buildNMOverwrites: `npx file-syncer ${group1} ${group2}`,
		buildNMOverwrites: `npx file-syncer --from ${nmWatchPaths.map(a=>`"${a}"`).join(" ")} --to NMOverwrites --replacements "node_modules/web-vcore/node_modules/" "node_modules/" --clearAtLaunch`,
	
		// docker
		dockerPrep: "node Scripts/PrepareDocker.js",
		//dockerBuild: "cross-env DOCKER_BUILDKIT=1 docker build -f ./Packages/server/Dockerfile -t dm-server-direct .",
		dockerBuild: DockerCommand("docker build -f ./Packages/server/Dockerfile -t dm-server-direct ."),
		//dockerBuild: "xcopy \"../../@Modules/web-vcore/Main/.yarn/cache\" \".yarn/cache2\" /s /e && docker build -f ./Packages/server/Dockerfile -t dm-server-direct .",
		// using robocopy works, but it's not much faster, if at all; seems slowdown is throughout the yarn install process (~3 minutes in docker, ~1s in Windows :/)
		//dockerBuild: "robocopy \"../../@Modules/web-vcore/Main/.yarn/cache\" \".yarn/cache2\" /s /e && docker build -f ./Packages/server/Dockerfile -t dm-server-direct .",
		//dockerBuild: "robocopy \"../../@Modules/web-vcore/Main/.yarn/cache\" \".yarn/cache2\" /s /e && docker build -f ./Packages/server/Dockerfile -t dm-server-direct .",
		//dockerBuild: "robocopy \"node_modules\" \".yarn/test1\" /s /e /NFL /NDL /NJH /NJS /nc /ns /np && docker build -f ./Packages/server/Dockerfile -t dm-server-direct .", // this takes even longer than yarn install...
		//dockerBuild: "tar -czh . | docker build -",
		dockerBuild_fullLog: DockerCommand("cross-env DOCKER_BUILDKIT=0 docker build -f ./Packages/server/Dockerfile -t dm-server-direct ."), // variant which preserves complete log (may increase build time)
		dockerBuild_ignoreCache: DockerCommand("docker build --no-cache -f ./Packages/server/Dockerfile -t dm-server-direct ."), // with cache disabled
		dockerBuild_gitlab: {
			"base": DockerCommand("docker build -f ./Packages/deploy/@DockerBase/Dockerfile -t registry.gitlab.com/venryx/debate-map ."),
			"server": DockerCommand("docker build -f ./Packages/server/Dockerfile -t registry.gitlab.com/venryx/debate-map ."),
			"web-server": DockerCommand("docker build -f ./Packages/web-server/Dockerfile -t registry.gitlab.com/venryx/debate-map ."),
		},
		dockerBuildAndPush_gitlab: {
			"base": "npm start backend.dockerBuild_gitlab.base && docker push registry.gitlab.com/venryx/debate-map",
			"server": "npm start backend.dockerBuild_gitlab.server && docker push registry.gitlab.com/venryx/debate-map",
			"web-server": "npm start backend.dockerBuild_gitlab.web-server && docker push registry.gitlab.com/venryx/debate-map",
		},
		
		// commented; tilt doesn't recognize "local" context as local, so it then tries to actually deploy images to local.tilt.dev, which then fails
		//tiltUp_local: DockerCommand("set TILT_WATCH_WINDOWS_BUFFER_SIZE=65536999&& tilt up --context local"),
		tiltUp_local: DockerCommand("set TILT_WATCH_WINDOWS_BUFFER_SIZE=65536999&& tilt up --context docker-desktop"),
		tiltUp_ovh: DockerCommand("set TILT_WATCH_WINDOWS_BUFFER_SIZE=65536999&& tilt up --context ovh"),
	},
	server: {
		// setup
		//initDB: "psql -f ./Packages/server/Scripts/InitDB.sql debate-map",
		//initDB: TSScript("server", "Scripts/InitDB.ts"),
		initDB: TSScript({pkg: "server"}, "Scripts/KnexWrapper.js", "initDB"),
		initDB_freshScript: `nps server.buildInitDBScript && nps server.initDB`,
		// k8s variants
		initDB_k8s: setk8sEnvVars_commandStr + `nps server.initDB`,
		initDB_freshScript_k8s: setk8sEnvVars_commandStr + `nps server.initDB_freshScript`,
		k8s_local_proxyOn8081: "kubectl -n dm-pg-operator port-forward $(kubectl get pod -n dm-pg-operator -o name -l postgres-operator.crunchydata.com/cluster=debate-map,postgres-operator.crunchydata.com/role=master) 8081:5432",
		//migrateDBToLatest: TSScript("server", "Scripts/KnexWrapper.js", "migrateDBToLatest"),
		// use this to dc sessions, so you can delete the debate-map db, so you can recreate it with the commands above
		dcAllDBSessions: `psql -c "
			SELECT pg_terminate_backend(pg_stat_activity.pid)
			FROM pg_stat_activity
			WHERE datname = "debate-map";"`,

		// db-shape and migrations
		buildInitDBScript: GetBuildInitDBScriptCommand(false),
		buildInitDBScript_watch: GetBuildInitDBScriptCommand(true),

		// first terminal
		//dev: "cd Packages/server && snowpack build --watch",
		//dev: "cd Packages/server && tsc --build --watch",
		dev: "tsc --build --watch Packages/server/tsconfig.json", // must do this way, else tsc output has "../common" paths, which "$tsc-watch" problem-matcher resolves relative to repo-root

		// second terminal
		run: GetStartServerCommand(),
	},
	"web-server": {
		dev: "tsc --build --watch Packages/web-server/tsconfig.json",

		dockerBuild: DockerCommand("docker build -f ./Packages/web-server/Dockerfile -t dm-web-server-direct ."),
		dockerBuild_fullLog: DockerCommand("cross-env DOCKER_BUILDKIT=0 docker build -f ./Packages/web-server/Dockerfile -t dm-web-server-direct ."), // variant which preserves complete log (may increase build time)
		dockerBuild_ignoreCache: DockerCommand("docker build --no-cache -f ./Packages/web-server/Dockerfile -t dm-web-server-direct ."), // with cache disabled
	},
});

function GetBuildInitDBScriptCommand(watch) {
	return TSScript({pkg: "server"}, `${FindPackagePath("mobx-graphlink")}/Scripts/BuildInitDBScript.ts`,
		`--classFolders ../../Packages/common/Source/DB ${paths.join(FindPackagePath("graphql-feedback"), "Source/Store/db")}`,
		`--templateFile ./Scripts/InitDB_Template.ts`,
		`--outFile ./Scripts/InitDB_Generated.ts`,
		watch ? "--watch" : "");
}

// if server-start command/flags change, update the entry in "launch.json" as well
function GetStartServerCommand() {
	/*const variantPath = serverVariantPaths[server];
	return `node ${variantPath}`;*/
	//return `node ./Packages/server/Build/esm/Source/Main.js`;
	//return `cd Packages/server && node ./Build/esm/Source/Main.js`;

	//return `cd Packages/server && node ./Dist/Main.js`;
	//return `cd Packages/server && node --experimental-modules ./Dist/Main.js`;
	//return `cd Packages/server && node -r esm ./Dist/Main.js`; // didn't enable named-exports from common-js, despite this suggesting it would: https://github.com/standard-things/esm/issues/897
	//return TSScript("server", "Source/Main.ts");

	// use TSScript helper for its module-resolution flags (not used for TS->JS transpilation)
	//return TSScript({pkg: "server", envStrAdd: "DEV=true"}, "Dist/Main.js");
	//return `cd Packages/server && node --experimental-modules --experimental-specifier-resolution=node ./Dist/Main.js`;
	return `cd Packages/server && node --experimental-specifier-resolution=node ./Dist/Main.js`;
}

function DockerCommand(commandStr) {
	//return `npm start dockerPrep && ${commandStr}`;
	return `node Scripts/PrepareDocker.js && ${commandStr}`;
}