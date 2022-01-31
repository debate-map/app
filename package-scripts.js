const fs = require("fs");
const paths = require("path");
const {spawn, exec, execSync} = require("child_process");
const {_packagesRootStr, pathToNPMBin, TSScript, FindPackagePath, commandName, commandArgs, Dynamic, Dynamic_Async} = require("./Scripts/NPSHelpers.js");

const scripts = {};
module.exports.scripts = scripts;

//const CurrentTime_SafeStr = ()=>new Date().toISOString().replace(/:/g, "-");
const CurrentTime_SafeStr = ()=>new Date().toLocaleString("sv").replace(/[ :]/g, "-"); // ex: 2021-12-10-09-18-52

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

const appNamespace = "default"; //"app";
const KubeCTLCmd = context=>`kubectl${context ? ` --context ${context}` : ""}`;
const GetPodInfos = (context = "", namespace = "", requiredLabels = [], filterOutNonRunning = true)=>{
	const cmdArgs = [
		KubeCTLCmd(context), "get", "pods",
		...(namespace ? ["-n", namespace] : ["--all-namespaces"]),
		...(requiredLabels.length ? ["-l", requiredLabels.join(",")] : []),
	];
	const entryStrings = execSync(cmdArgs.join(" ")).toString().trim().split("\n").slice(1);
	//console.log("Statuses:\n", entryStrings.join("\n"));
	let result = entryStrings.map(str=>{
		// example source string: "dm-app-server-69b55c8dfc-k5zrq   1/1     Running   0          2d"
		const [sourceStr, name, ready, status, restarts, age] = /^(\S+)\s{3,}(\S+)\s{3,}(\S+)\s{3,}(\S+)\s{3,}(\S+)$/.exec(str);
		return {sourceStr, name, ready, status, restarts, age};
	});
	//if (filterOutEvicted) result = result.filter(a=>a.status != "Evicted");
	if (filterOutNonRunning) result = result.filter(a=>a.status == "Running");
	return result;
};
const GetPodName_DB = context=>{
	//return GetPodInfos(context).find(a=>a.name.startsWith("debate-map-instance1-")).name;
	return GetPodInfos(context, "postgres-operator", ["postgres-operator.crunchydata.com/cluster=debate-map", "postgres-operator.crunchydata.com/role=master"])[0].name;
};
const GetPodName_WebServer = context=>GetPodInfos(context, appNamespace, ["app=dm-web-server"])[0].name;
const GetPodName_AppServerRS = context=>GetPodInfos(context, appNamespace, ["app=dm-app-server-rs"])[0].name;
const GetPodName_AppServerJS = context=>GetPodInfos(context, appNamespace, ["app=dm-app-server-js"])[0].name;

/** Gets the k8s context that is selected as the "current" one, in Docker Desktop. */
function K8sContext_Current() {
	return execSync(`kubectl config current-context`).toString().trim();
}
/** Gets the k8s context passed to the current nps script. (for example, "local", if this was run: npm start "db.psql_k8s local") */
function K8sContext_Arg(throwErrorIfNotPassed = false) {
	let contextArg;
	if (commandArgs[0] && !commandArgs[0].includes(":")) {
		contextArg = commandArgs[0];
	}

	if (contextArg == null && throwErrorIfNotPassed) {
		throw new Error("Must explicitly specify context for this command.");
	}

	return contextArg;
}
function K8sContext_Arg_Required() { return K8sContext_Arg(true); }

const PrepDockerCmd = ()=>{
	//return `npm start dockerPrep &&`;
	return `node Scripts/PrepareDocker.js &&`;
};

function GetServeCommand(nodeEnv = null) {
	return `cross-env-shell ${nodeEnv ? `NODE_ENV=${nodeEnv} ` : ""}_USE_TSLOADER=true NODE_OPTIONS="--max-old-space-size=8192" "npm start client.dev.part2"`;
}

const {nmWatchPaths} = require("./Scripts/NodeModuleWatchPaths.js");
const startBestShellCmd = `sh -c "clear; (bash || ash || sh)"`;
Object.assign(scripts, {
	"cargo-test": "set RUSTC_BOOTSTRAP=1& cargo test", // for powershell: "$env:RUSTC_BOOTSTRAP = '1'; cargo test"
	// gets stuff we might want, from the k8s pods
	kget: {
		"app-server-rs": Dynamic(()=>{
			const localPath = `./Temp/kget_as-rs_${CurrentTime_SafeStr()}`;

			// package up the files we want into a "temp_for_kget" folder, so we can copy the files in one k8s command (see: https://devops.stackexchange.com/a/14563)
			/*const bundleFilesCmd = `sh -c "mkdir -p ./temp_for_kget && cp cargo-timing.html ./temp_for_kget/ && cp ./*profdata ./temp_for_kget/"`;
			execSync(`${KubeCTLCmd(commandArgs[0])} exec -ti -n ${appNamespace} ${GetPodName_AppServerRS(commandArgs[0])} -c dm-app-server-rs -- ${bundleFilesCmd}`);*/

			const podName = GetPodName_AppServerRS(commandArgs[0]);
			execSync(`${KubeCTLCmd(commandArgs[0])} cp ${appNamespace}/${podName}:/dm_repo/Packages/app-server-rs/kgetOutput_buildTime/. ${localPath}`);
			console.log(`Files copied from "${podName}" to: ${paths.resolve(localPath)}`);

			execSync(`start "" "${paths.resolve(localPath)}"`);

			// now you can do various things with the profiler data; see: https://fasterthanli.me/articles/why-is-my-rust-build-so-slow
		}),

		// before you can use this, install crox and such (see error message below for details)
		lastProfData_prep: Dynamic(()=>{
			/*require("globby")("./Temp/kget_as-rs_*", {onlyFiles: false, stats: true}).then(/** @param {import("globby").Entry[]} folders *#/ folders=>{
				folders.sort((a, b)=>a.stats.ctimeMs - b.stats.ctimeMs);
				const latestKGetFolder = folders.slice(-1)[0];
				const profFile = paths.resolve(latestKGetFolder, "")
			});*/
			require("globby")("./Temp/kget_as-rs_*/*profdata", {stats: true}).then(/** @param {import("globby").Entry[]} files */ files=>{
				files.sort((a, b)=>a.stats.ctimeMs - b.stats.ctimeMs);
				const latestProfDataFile = paths.resolve(files.slice(-1)[0].path);
				const folder = paths.dirname(latestProfDataFile);
				try {
					//const command = `cd ${folder} && crox ${paths.basename(latestProfDataFile)}`;
					const command = `cd ${folder} && crox --minimum-duration 100000 ${paths.basename(latestProfDataFile)}`; // only keep entries that are 100ms or longer
					console.log("Running:", command);
					execSync(command);
				} catch (ex) {
					if (ex.toString().includes("'crox' is not recognized")) {
						console.error("Crox is not installed. Install using: cargo install --git https://github.com/rust-lang/measureme crox flamegraph summarize");
						return;
					}
					throw ex;
				}
				execSync(`start "" "${folder}"`);
			});
		}),

		// other rust profiling-related commands (install with: cargo install cargo-llvm-lines, run: in place you'd run "cargo build")
		// 1) $env:RUSTFLAGS = '-Awarnings'; cargo llvm-lines | Select -First 30
	},
	ssh: {
		db: Dynamic(()=>{
			return `${KubeCTLCmd(commandArgs[0])} exec -ti -n postgres-operator ${GetPodName_DB(commandArgs[0])} -c database -- ${startBestShellCmd}`;
			/*const commandStr = `${KubeCTLCmd(commandArgs[0])} exec -ti -n postgres-operator ${podName} -c database -- bash`;
			spawn(commandStr.split(" ")[0], commandStr.split(" ").slice(1), {stdio: "inherit"});*/
		}),
		"web-server": Dynamic(()=>{
			return `${KubeCTLCmd(commandArgs[0])} exec -ti -n ${appNamespace} ${GetPodName_WebServer(commandArgs[0])} -c dm-web-server -- ${startBestShellCmd}`;
		}),
		"app-server-rs": Dynamic(()=>{
			return `${KubeCTLCmd(commandArgs[0])} exec -ti -n ${appNamespace} ${GetPodName_AppServerRS(commandArgs[0])} -c dm-app-server-rs -- ${startBestShellCmd}`;
		}),
		"app-server-js": Dynamic(()=>{
			return `${KubeCTLCmd(commandArgs[0])} exec -ti -n ${appNamespace} ${GetPodName_AppServerJS(commandArgs[0])} -c dm-app-server-js -- ${startBestShellCmd}`;
		}),

		etcd_dumpAsJSON: Dynamic(()=>{
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
		}),

		// for this to work, you have to enable EphemeralContainers in your k8s cluster, as seen here: https://stackoverflow.com/a/68971526
		debugPod: Dynamic(()=>{
			const [podNameSearchStr, context] = commandArgs;
			const podsContainingSearchStr = GetPodInfos(context).filter(a=>a.name.includes(podNameSearchStr));
			let targetPod = podsContainingSearchStr.find(a=>a.name == podNameSearchStr);
			if (targetPod == null) {
				console.log(`Could not find pod with the exact name "${podNameSearchStr}", so selecting first from these pods containing the provided string:`, podsContainingSearchStr.map(a=>a.name));
				targetPod = podsContainingSearchStr[0];
			}
			return `${KubeCTLCmd(context)} debug -n ${targetPod.namespace} -it ${targetPod.name} --image=busybox --target=${targetPod}`;
		}),
	},
});

function GetPortForwardCommandsStr(context) {
	const fd = context == "ovh" ? "4" : "3"; // first-digit of port-numbers
	const forDB = `${KubeCTLCmd(context)} -n postgres-operator port-forward ${GetPodName_DB(context)} ${fd}205:5432`;
	if (commandArgs.includes("onlyDB")) return forDB;

	const forWebServer = `${KubeCTLCmd(context)} -n ${appNamespace} port-forward ${GetPodName_WebServer(context)} ${fd}005:3005`;
	const forAppServerRS = `${KubeCTLCmd(context)} -n ${appNamespace} port-forward ${GetPodName_AppServerRS(context)} ${fd}105:3105`;
	const forAppServerJS = `${KubeCTLCmd(context)} -n ${appNamespace} port-forward ${GetPodName_AppServerJS(context)} ${fd}155:3155`;
	const forAppServerJS_inspector = `${KubeCTLCmd(context)} -n ${appNamespace} port-forward ${GetPodName_AppServerJS(context)} ${fd}165:3165`;
	if (commandArgs.includes("onlyInspector")) return forAppServerJS_inspector;

	return `concurrently --kill-others --names db,ws,asr,asj,asji "${forDB}" "${forWebServer}" "${forAppServerRS}" "${forAppServerJS}" "${forAppServerJS_inspector}"`;
}

// for scripts that are useful to multiple multiple backend packages (server, web-server, etc.)
Object.assign(scripts, {
	backend: {
		// general
		//buildNMOverwrites: `npx file-syncer ${group1} ${group2}`,
		buildNMOverwrites: `npx file-syncer --from ${nmWatchPaths.map(a=>`"${a}"`).join(" ")} --to NMOverwrites --replacements "node_modules/web-vcore/node_modules/" "node_modules/" --clearAtLaunch`,

		// docker
		dockerPrep: "node Scripts/PrepareDocker.js",
		pulumiUp: `${PrepDockerCmd()} pulumi up`,

		// port-forwarding (standalone; without tilt)
		forward_local: Dynamic(()=>{
			return GetPortForwardCommandsStr("local");
		}),
		forward_remote: Dynamic(()=>{
			return GetPortForwardCommandsStr("ovh");
		}),
		/*k8s_proxyOn8081: Dynamic(()=>{
			console.log("Test");
			return KubeCTLCommand(commandArgs[0], `-n postgres-operator port-forward $(${GetPodNameCmd_DB(commandArgs[0])}) 8081:5432`);
		}),*/

		// commented; tilt doesn't recognize "local" context as local, so it then tries to actually deploy images to local.tilt.dev, which then fails
		tiltUp_local:		`${PrepDockerCmd()}		${SetTileEnvCmd(false, "local")}					tilt up --context local`,
		tiltDown_local:	`${PrepDockerCmd()}		${SetTileEnvCmd(false, "local")}					tilt down --context local`,
		tiltUp_docker:		`${PrepDockerCmd()}		${SetTileEnvCmd(false, "docker-desktop")}		tilt up --context docker-desktop`,
		tiltUp_k3d:			`${PrepDockerCmd()}		${SetTileEnvCmd(false, "k3d-main-1")}			tilt up --context k3d-main-1`,
		tiltUp_kind:		`${PrepDockerCmd()}		${SetTileEnvCmd(false, "kind-main-1")}			tilt up --context kind-main-1`,
		tiltUp_ovh:			`${PrepDockerCmd()}		${SetTileEnvCmd(true, "ovh")}						tilt up --context ovh --port 10351`, // tilt-port +1, so can coexist with tilt dev-instance
		tiltDown_ovh:		`${PrepDockerCmd()}		${SetTileEnvCmd(true, "ovh")}						tilt down --context ovh`,

		forceKillNS: Dynamic(()=>{
			const pathToKillScript = paths.resolve("./Scripts/KillKubeNS.sh");
			const pathToKillScript_wsl = pathToKillScript.replace(/\\/g, "/").replace("C:/", "/mnt/c/");
			return `wsl ${pathToKillScript_wsl} ${commandArgs.join(" ")}`;
		}),

		// dumps (ie. pg_dump backups) [you can also use DBeaver to make a dump; see readme for details]
		makeDBDump: Dynamic(()=>{
			const context = commandArgs[0] ?? K8sContext_Current();
			const inPodCmd = "pg_dump -U postgres debate-map";
			const dumpCmd_withoutInPodCMD = `${KubeCTLCmd(context)} exec -n postgres-operator ${GetPodName_DB(context)} -- bash -c`;

			// had to switch from execSync to spawn,
			//const dbDumpStr = execSync(`${dumpCmd_withoutInPodCMD} "${inPodCmd}"`).toString().trim();
			const dumpCmd_withoutInPodCMD_parts = dumpCmd_withoutInPodCMD.split(" ");
			const dumpProcess = spawn(dumpCmd_withoutInPodCMD_parts[0], [...dumpCmd_withoutInPodCMD_parts.slice(1), inPodCmd]);
			let dbDumpStr = "";
			dumpProcess.stdout.on("data", chunk=>{
				dbDumpStr += chunk.toString();
			});

			dumpProcess.on("error", e=>{
				console.log("DB dump process failed. Error:", e);
			});
			dumpProcess.on("exit", ()=>{
				const filePath_rel = `../Others/@Backups/DBDumps_${context}/${CurrentTime_SafeStr()}.sql`;
				const folderPath_rel = paths.dirname(filePath_rel);
				fs.mkdirSync(folderPath_rel, {recursive: true});
				fs.writeFileSync(filePath_rel, dbDumpStr);
				console.log(`DB dump (of context: ${context}) created at: ${paths.resolve(filePath_rel)}`);
				execSync(`start "" "${paths.dirname(paths.resolve(filePath_rel))}"`);
			});
		}),

		// backups
		viewDBBackups: Dynamic(()=>{
			const devEnv = commandArgs[0] == "dev" || K8sContext_Current() == "local";
			const {bucket_dev_uniformPrivate_name, bucket_prod_uniformPrivate_name} = require("./PulumiOutput_Public.json"); // eslint-disable-line
			const bucket_uniformPrivate_name = devEnv ? bucket_dev_uniformPrivate_name : bucket_prod_uniformPrivate_name;
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
			return `kubectl annotate -n postgres-operator postgrescluster debate-map --overwrite postgres-operator.crunchydata.com/pgbackrest-backup-`;
		}),

		restoreDBBackup_prep: Dynamic(()=>{
			const backupLabel = commandArgs[0]; // example: "20200102-012030F"
			if (backupLabel == null) {
				throw new Error(`
					You must specify the label for the backup you want to restore. (ie. the folder name under "/db-backups-pgbackrest/backup/db" in the cloud-storage bucket)
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
				}}},
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
				}}},
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
		// called "removeAnnotation" rather than "cancel", because it's not reliable as a cancel (ie. even without the annotation, a restore will be performed in a fresh cluster, if a valid restore config is set)
		restoreDBBackup_removeAnnotation: Dynamic(()=>{
			return `kubectl annotate -n postgres-operator postgrescluster debate-map --overwrite postgres-operator.crunchydata.com/pgbackrest-restore-`;
		}),
	},
});
scripts.backend.dockerBuild_gitlab_base = `${PrepDockerCmd()} docker build -f ./Packages/deploy/@DockerBase/Dockerfile -t registry.gitlab.com/venryx/debate-map .`;
function SetTileEnvCmd(prod, context) {
	return `set TILT_WATCH_WINDOWS_BUFFER_SIZE=65536999&& ${prod ? "set ENV=prod&&" : "set ENV=dev&&"} ${context ? `set CONTEXT=${context}&&` : ""}`;
}

function GetK8sPGUserAdminSecretData(context) {
	const fromBase64 = str=>Buffer.from(str, "base64");
	const secretsStr = execSync(`kubectl${context ? ` --context ${context}` : ""} get secrets -n postgres-operator debate-map-pguser-admin -o go-template='{{.data}}'`).toString();
	const keyValuePairs = secretsStr.match(/\[(.+)\]/)[1].split(" ").map(keyValPairStr=>keyValPairStr.split(":"));
	const GetField = name=>fromBase64(keyValuePairs.find(a=>a[0] == name)[1]);
	return {secretsStr, keyValuePairs, GetField};
}
function ImportPGUserSecretAsEnvVars(context) {
	const secret = GetK8sPGUserAdminSecretData(context);
	const newEnvVars = {
		// node-js flag
		NODE_TLS_REJECT_UNAUTHORIZED: 0, // tls change needed atm, till I figure out how to copy over signing data

		// app-level
		//DB_ADDR: secret.GetField("host"),
		DB_ADDR: "localhost",
		//DB_PORT: secret.GetField("port"),
		DB_PORT:
			context == "ovh" ? 4205 :
			context == "local" ? 3205 :
			null,
		DB_DATABASE: secret.GetField("dbname"),
		DB_USER: secret.GetField("user"),
		DB_PASSWORD: secret.GetField("password"),
	};
	Object.assign(process.env, newEnvVars);
}

Object.assign(scripts, {
	"app-server": {
		// first terminal
		//dev: "cd Packages/app-server && tsc --build --watch",
		dev: "tsc --build --watch Packages/app-server/tsconfig.json", // must do this way, else tsc output has "../common" paths, which "$tsc-watch" problem-matcher resolves relative to repo-root

		// second terminal
		run: GetStartServerCommand(),

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
		dockerBuild_gitlab: `${PrepDockerCmd()} docker build -f ./Packages/app-server/Dockerfile -t registry.gitlab.com/venryx/debate-map .`,
	},
	"web-server": {
		dev: "tsc --build --watch Packages/web-server/tsconfig.json",

		dockerBuild: `${PrepDockerCmd()} docker build -f ./Packages/web-server/Dockerfile -t dm-web-server-direct .`,
		dockerBuild_fullLog: `${PrepDockerCmd()} cross-env DOCKER_BUILDKIT=0 docker build -f ./Packages/web-server/Dockerfile -t dm-web-server-direct .`, // variant which preserves complete log (may increase build time)
		dockerBuild_ignoreCache: `${PrepDockerCmd()} docker build --no-cache -f ./Packages/web-server/Dockerfile -t dm-web-server-direct .`, // with cache disabled
		dockerBuild_gitlab: `${PrepDockerCmd()} docker build -f ./Packages/web-server/Dockerfile -t registry.gitlab.com/venryx/debate-map .`,
	},
});

// todo: clean up the initDB stuff, to be more certain to be safe
function StartPSQLInK8s(context, database = "debate-map", spawnOptions) {
	/*const getPasswordCmd = `${KubeCTLCmd(commandArgs[0])} -n postgres-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}')`;
	const password = execSync(getPasswordCmd).toString().trim();
	
	execSync(`$env:PGPASSWORD=${password}; psql -h localhost -p [3205/4205] -U admin -d debate-map`);
	execSync(`Add-Type -AssemblyName System.Web; psql "postgresql://admin:$([System.Web.HTTPUtility]::UrlEncode("${password}"))@localhost:[3205/4205]/debate-map"`);*/

	//ImportPGUserSecretAsEnvVars(context);
	const secret = GetK8sPGUserAdminSecretData(context);

	const argsStr = `-h localhost -p ${context == "ovh" ? 4205 : 3205} -U admin -d ${database}`;

	const env = {
		//...process.env,
		//PGDATABASE: "debate-map",
		//PGUSER: "admin",
		PGPASSWORD: secret.GetField("password"),
	};
	//if (startType == "spawn") {
	return spawn(`psql`, argsStr.split(" "), {
		env,
		// default stdio field to where input is piped (ie. sent from caller of this func), and output is written to console
		stdio: ["pipe", "inherit", "inherit"], // pipe stdin, inherit stdout, inherit stderr
		...spawnOptions,
	});
	/*} else if (startType == "exec") {
		execSync(`psql ${argsStr}` + (command ? " -c " : ""));
	}*/
}
Object.assign(scripts, {
	db: {
		// general
		psql_k8s: Dynamic(()=>{
			const database = commandArgs.find(a=>a.startsWith("db:"))?.slice("db:".length) ?? "debate-map";
			console.log("Connecting psql to database:", database);
			const psqlProcess = StartPSQLInK8s(K8sContext_Arg(), database, {stdio: "inherit"});
		}),

		// db-shape and such
		buildInitDBScript: GetBuildInitDBScriptCommand(false),
		buildInitDBScript_watch: GetBuildInitDBScriptCommand(true),

		// db setup
		//initDB: "psql -f ./Packages/app-server/Scripts/InitDB.sql debate-map",
		//initDB: TSScript("app-server", "Scripts/InitDB.ts"),
		// init-db, base (without env-vars set, this controls port-5432/native/non-k8s postgres instance -- which is not recommended)
		initDB: TSScript({pkg: "app-server"}, "Scripts/KnexWrapper.js", "initDB"),
		initDB_freshScript: `nps db.buildInitDBScript && nps db.initDB`,
		// init-db, for k8s postgres instance (standard)
		initDB_k8s: Dynamic(()=>{
			ImportPGUserSecretAsEnvVars(K8sContext_Arg_Required());
			return `${pathToNPMBin("nps.cmd", 0, true, true)} db.initDB`;
		}),
		initDB_freshScript_k8s: Dynamic(()=>{
			ImportPGUserSecretAsEnvVars(K8sContext_Arg_Required());
			return `${pathToNPMBin("nps.cmd", 0, true, true)} db.initDB_freshScript`;
		}),

		// db clearing/reset
		//migrateDBToLatest: TSScript("app-server", "Scripts/KnexWrapper.js", "migrateDBToLatest"),
		// use this to dc sessions, so you can delete the debate-map db, so you can recreate it with the commands above
		dcAllDBSessions_nonK8s: `psql -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE datname = 'debate-map';"`,
		//dcAllDBSessions_k8s: `psql TODO -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE datname = 'debate-map';"`,
		dcAllDBSessions_k8s: Dynamic(()=>{
			const psqlProcess = StartPSQLInK8s(K8sContext_Arg_Required(), "postgres");
			psqlProcess.stdin.write(`SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE datname = 'debate-map';\n`);
			psqlProcess.stdin.write(`exit\n`);
		}),
		// this script "deletes" the "debate-map" database within the specified k8s-cluster's postgres instance (for safety, it technically renames it rather than deletes it)
		demoteDebateMapDB_k8s: Dynamic(()=>{
			const psqlProcess = StartPSQLInK8s(K8sContext_Arg_Required(), "postgres");
			psqlProcess.stdin.write(`SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE datname = 'debate-map';\n`);
			const newName = `debate-map-old-${CurrentTime_SafeStr()}`;

			console.log("Renaming debate-map database to:", newName);
			psqlProcess.stdin.write(`ALTER DATABASE "debate-map" RENAME TO "${newName}";\n`);
			// if you need to find the list of databases, run query (in psql or DBeaver): SELECT datname FROM pg_database WHERE datistemplate = false;

			psqlProcess.stdin.write(`exit\n`);
		}),
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