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
const GetPodNameCmd_DB =					contextName=>`${KubeCTLCmd(contextName)} get pod -o name -n postgres-operator -l postgres-operator.crunchydata.com/cluster=debate-map,postgres-operator.crunchydata.com/role=master`;
const GetPodNameCmd_WebServer =			contextName=>`${KubeCTLCmd(contextName)} get pod -o name -n app -l app=dm-web-server`;
const GetPodNameCmd_AppServer =			contextName=>`${KubeCTLCmd(contextName)} get pod -o name -n app -l app=dm-app-server`;
const GetPodsMatchingPartialName = (partialName, contextName)=>{
	const entryStrings = execSync(`${KubeCTLCmd(contextName)} get pods --all-namespaces | findstr ${partialName}`).toString().trim().split("\n");
	return entryStrings.map(str=>{
		const parts = str.split("   ").map(a=>a.trim());
		return {
			namespace: parts[0],
			name: parts[1],
		};
	});
};

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

		"etcd_dumpAsJSON": Dynamic(()=>{
			const etcdCommand = `ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 --cacert=/run/config/pki/etcd/ca.crt --cert=/run/config/pki/etcd/server.crt --key=/run/config/pki/etcd/server.key get '' --prefix=true -w json`;
			const jsonStr = execSync(`kubectl exec -it -n kube-system etcd-docker-desktop -- /bin/sh -ec "${etcdCommand}"`).toString().trim();
			const data = JSON.parse(jsonStr);
			for (const kvEntry of data.kvs) {
				kvEntry.key = Buffer.from(kvEntry.key, "base64").toString();
				kvEntry.value = Buffer.from(kvEntry.value, "base64").toString();
				try {
					const valueAsJSONObj = JSON.parse(kvEntry.value);
					kvEntry.value_unwrapped = valueAsJSONObj;
				} catch {}
			}
			fs.writeFileSync(`./Temp/EtcdDump_${Date.now()}.json`, JSON.stringify(data, null, "\t"));

			/*
				Some notes for things beyond those used above:
				* Path where etcd data seems to be stored: \\wsl$\docker-desktop-data\version-pack-data\community\etcd\member\snap
				* Path where kubeadm seems to write the apiserver/scheduler configs after application: \\wsl$\docker-desktop-data\version-pack-data\community\kubeadm
					(unfortunately, editing these files is pointless since that causes k8s to not start up, and resetting the cluster doesn't help since that resets those files as well)
			*/
		}),
		// if you mess up your local kubernetes cluster with this, you'll likely have to run Docker Desktop's "Clean / Purge Data" -> "WSL" command (as I did)
		"etcd_importNewEntry": Dynamic(()=>{
			//const [key, value] = commandArgs;
			const newEntry = JSON.parse(fs.readFileSync("./Temp/NewEntry.json").toString()); // user should create this file, by copying the entry from the EtcdDump_XXX.json file (created using etcd_dumpAsJSON)

			/*const key_base64 = Buffer.from(key).toString("base64");
			const value_base64 = Buffer.from(value).toString("base64");
			const etcdCommand_importantPart = `put ${key_base64} ${value_base64}`; // it's base-64, so we don't need to put quotes around it (thankfully!)
			const etcdCommand = `ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 --cacert=/run/config/pki/etcd/ca.crt --cert=/run/config/pki/etcd/server.crt --key=/run/config/pki/etcd/server.key ${etcdCommand_importantPart}`;
			//execSync(`kubectl exec -it -n kube-system etcd-docker-desktop -- /bin/sh -ec "${etcdCommand}"`);
			return `kubectl exec -it -n kube-system etcd-docker-desktop -- /bin/sh -ec "${etcdCommand}"`;*/
			
			/*const {key, value} = newEntry;
			const etcdCommand_importantPart = `put ${key} \\"${value.replace(/\\/g, `\\\\`).replace(/"/g, `\\"`).replace(/\\/g, `\\\\`).replace(/"/g, `\\"`)}\\"`;
			const etcdCommand = `ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 --cacert=/run/config/pki/etcd/ca.crt --cert=/run/config/pki/etcd/server.crt --key=/run/config/pki/etcd/server.key ${etcdCommand_importantPart}`;
			//execSync(`kubectl exec -it -n kube-system etcd-docker-desktop -- /bin/sh -ec "${etcdCommand}"`);
			return `kubectl exec -it -n kube-system etcd-docker-desktop -- /bin/sh -ec "${etcdCommand}"`;*/

			const {key, value} = newEntry;
			const shellInEtcdPod = spawn("kubectl", "exec -it -n kube-system etcd-docker-desktop -- /bin/sh".split(" "));
			shellInEtcdPod.stdin.setEncoding('utf-8');
			shellInEtcdPod.stdout.pipe(process.stdout);
			shellInEtcdPod.stdin.write(`ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 --cacert=/run/config/pki/etcd/ca.crt --cert=/run/config/pki/etcd/server.crt --key=/run/config/pki/etcd/server.key put ${key}\n`);
			shellInEtcdPod.stdin.write(value);
			shellInEtcdPod.stdin.end(); /// this call seems necessary, at least with plain node.js executable
		}),
		"etcd_deleteKey": Dynamic(()=>{
			const [key] = commandArgs;
			const etcdCommand = `ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 --cacert=/run/config/pki/etcd/ca.crt --cert=/run/config/pki/etcd/server.crt --key=/run/config/pki/etcd/server.key del ${key}`;
			return `kubectl exec -it -n kube-system etcd-docker-desktop -- /bin/sh -ec "${etcdCommand}"`;
		}),

		"debugPod": Dynamic(()=>{
			const podNameSearchStr = commandArgs[0];
			const podsMatchingSearchStr = GetPodsMatchingPartialName(podNameSearchStr);
			let targetPod = podsMatchingSearchStr.find(a=>a.name == podNameSearchStr);
			if (targetPod == null) {
				console.log(`Could not find pod with the exact name "${podNameSearchStr}", so selecting first from matches:`, podsMatchingSearchStr.map(a=>a.name));
				targetPod = podsMatchingSearchStr[0];
			}
			// can't use this, since ephemeral-containers can't be enabled in docker-desktop atm (https://stackoverflow.com/questions/65615647/enable-k8s-experimental-features-in-docker-desktop)
			return `${KubeCTLCmd(commandArgs[1])} debug -n ${targetPod.namespace} -it ${targetPod.name} --image=busybox --target=${targetPod}`;

			// instead, we'll make a copy of the pod named "debug-pod-1" (which should stay alive even after the target-pod is destroyed)
			//return `${KubeCTLCmd(commandArgs[1])} debug -n ${targetPod.namespace} ${targetPod.name} -it --image=ubuntu --share-processes --copy-to=debug-pod-1`;
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
			const backupID = new Date().toISOString();
			return `${KubeCTLCmd(commandArgs[0])} annotate -n postgres-operator postgrescluster debate-map --overwrite postgres-operator.crunchydata.com/pgbackrest-backup="${backupID}"`;
		}),
		makeDBBackup_retry: Dynamic(()=>{
			const jobNames_rawStr = execSync(`${KubeCTLCmd(commandArgs[0])} -n postgres-operator get jobs -o custom-columns=:.metadata.name`).toString().trim();
			const dbBackupJobNames = jobNames_rawStr.split(" ").filter(a=>a.startsWith("debate-map-backup-"));
			return `${KubeCTLCmd(commandArgs[0])} -n postgres-operator delete jobs ${dbBackupJobNames.join(" ")}`;
		}),
		makeDBBackup_cancel: Dynamic(()=>{
			// todo
		}),
		restoreDBBackup_prep: Dynamic(()=>{
			const backupLabel = commandArgs[0]; // example: "20200102-012030F"
			if (backupLabel == null) {
				throw new Error(`
					You must specify the label for the backup you want to restore. (ie. the folder name under "/db-backups/pgbackrest/backup/db" in the cloud-storage bucket)
					Example: npm start "backend.restoreDBBackup 20200102-012030F" (restores the backup created at 1:20:30am on January 2nd, 2020)
				`.trim());
			}

			//const sl = (start, end)=>backupLabel.slice(start, end);
			//const labelAsTimeStr = `${sl(0, 4)}-${sl(4, 6)}-${sl(6, 8)} ${sl(9, 11)}:${sl(11, 13)}:${sl(13, 15)} UTC`; // example: "2020-01-02 01:20:30 UTC"
			const patchJSON = JSON.stringify({
				spec: {backups: {pgbackrest: {
					restore: {
						enabled: true,
						repoName: "repo2",
						options: [
							//`--delta`, // this enables the restore to work even if the pgo resource/pods/etc. are recreated
							//`--force`, // this enables the restore to work even if the pgo resource/pods/etc. are recreated
							`--set ${backupLabel}`,
							//`--type=time`,
							//`--target="${labelAsTimeStr}"`,
						],
					},
				}}}
			});
			const patchJSON_escaped = patchJSON
				.replace(/\\/g, `\\\\`) // escape [backslash] into [backslash]+[backslash]
				.replace(/"/g, `\\"`); // escape [quotation-mark] into [backslash]+[quotation-mark]
			return `${KubeCTLCmd(commandArgs[1])} patch -n postgres-operator postgrescluster debate-map --type=merge --patch "${patchJSON_escaped}"`;

			// The PGO recommended restore approach, which is declarative, is given here: https://access.crunchydata.com/documentation/postgres-operator/5.0.2/tutorial/disaster-recovery/#perform-an-in-place-point-in-time-recovery-pitr
			// However, we will instead by sending a restore command to the database pod directly, because imo a restore operation is just confusing to try to fit into the declarative mold.
			// commented; couldn't get to work in a way that would be safe (pod restarts after enough seconds, and I think the restore would fail if it didn't complete before that restart)
			/*const podName = execSync(GetPodNameCmd_DB(commandArgs[1])).toString().trim();
			return `${KubeCTLCmd(commandArgs[1])} exec -ti -n postgres-operator ${podName} -c database -- bash -c "kill -INT `head -1 /pgdata/pg13/postmaster.pid`; pgbackrest restore --stanza=db --repo=2 --set=${backupLabel}"`;*/
		}),
		restoreDBBackup_cancel: Dynamic(()=>{
			const patchJSON = JSON.stringify({
				spec: {backups: {pgbackrest: {
					restore: {
						enabled: false,
						repoName: "repo2",
						options: [],
					},
				}}}
			});
			const patchJSON_escaped = patchJSON
				.replace(/\\/g, `\\\\`) // escape [backslash] into [backslash]+[backslash]
				.replace(/"/g, `\\"`); // escape [quotation-mark] into [backslash]+[quotation-mark]
			return `${KubeCTLCmd(commandArgs[1])} patch -n postgres-operator postgrescluster debate-map --type=merge --patch "${patchJSON_escaped}"`;
		}),
		restoreDBBackup_apply: Dynamic(()=>{
			const restoreID = new Date().toISOString();
			return `kubectl annotate -n postgres-operator postgrescluster debate-map --overwrite postgres-operator.crunchydata.com/pgbackrest-restore=${restoreID}`;
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