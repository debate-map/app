const fs = require("fs");
const glob = require("glob");
const paths = require("path");
const {spawn, exec, execSync} = require("child_process");
const {OpenFileExplorerToPath, SetEnvVarsCmd, _packagesRootStr, pathToNPMBin, JSScript, TSScript, commandArgs, Dynamic, CurrentTime_SafeStr, SetUpLoggingOfScriptStartAndEndTimes} = require("./Scripts/NPSHelpers.js");

const {noTimings} = SetUpLoggingOfScriptStartAndEndTimes();

const scripts = {};
module.exports.scripts = scripts;

// ungrouped scripts
Object.assign(scripts, {
	// if using "yalc push" from web-vcore and such (see its readme for me details), run this script instead of "yarn install"
	"yalc-i": "yarn install && git checkout HEAD -- yarn.lock",
});

Object.assign(scripts, {
	client: {
		tsc:         `cd Packages/client && ${pathToNPMBin("tsc", 2)} --build --watch`,
		tsc_noWatch: `cd Packages/client && ${pathToNPMBin("tsc", 2)} --build`,
		//tscWatch: `./node_modules/.bin/tsc-watch.cmd --onSuccess "node ./Scripts/Build/OnSuccess.js"`,
		cypress: {
			open: "cd Packages/client && cypress open",
			run: "cd Packages/client && cypress run",
		},
		clean: "cd Packages/client && shx rm -rf Dist",

		// webpack (old)
		devWP: {
			//default: `cross-env-shell NODE_ENV=development _USE_TSLOADER=true NODE_OPTIONS="--max-old-space-size=8192 --experimental-modules" "npm start dev-part2"`,
			default: GetServeCommand("dev"),
			staticServe: GetServeCommand(), // same as above, except with NODE_ENV=null (for static-serving of files in Dist folder)
			noDebug: `nps "dev --no_debug"`,
			//part2: `cross-env TS_NODE_OPTIONS="--experimental-modules" ts-node-dev --project Scripts/tsconfig.json Scripts/Bin/Server.js`,
			//part2: `cross-env NODE_OPTIONS="--experimental-modules" ts-node --project Scripts/tsconfig.json Scripts/Bin/Server.js`,
			//part2: `cross-env ts-node-dev --project Scripts/tsconfig.json --ignore none Scripts/Bin/Server.js`,
			//part2: TSScript("client", "Scripts/Bin/Server"), // for now, call directly; no ts-node-dev [watching] till figure out use with new type:module approach
			//part2: TSScript({pkg: _packagesRootStr}, "client/Scripts/Bin/Server"), // for now, call directly; no ts-node-dev [watching] till figure out use with new type:module approach
			part2: JSScript({pkg: _packagesRootStr}, "client/Scripts/Bin/Server"),

			//withStats: `cross-env-shell NODE_ENV=development _USE_TSLOADER=true OUTPUT_STATS=true NODE_OPTIONS="--max-old-space-size=8192 --experimental-modules" "ts-node-dev --project Scripts/tsconfig.json Scripts/Bin/Server"`,
			withStats: `cross-env-shell NODE_ENV=development _USE_TSLOADER=true OUTPUT_STATS=true NODE_OPTIONS="--max-old-space-size=8192" "ts-node-dev --project client/Scripts/tsconfig.json --ignore none client/Scripts/Bin/Server"`,
		},
		//compileWP: TSScript({pkg: "client"}, "Scripts/Bin/Compile"),
		compileWP: "cd Packages/client && node --experimental-specifier-resolution=node ./Scripts/Bin/Compile.js",
		buildWP: {
			default: `cross-env-shell "npm start client.clean && npm start client.compileWP"`,
			dev: `cross-env NODE_ENV=development npm start client.buildWP`,
			// 2024-03-18: for venryx, "quick" takes 45s, and "non-quick" takes 75s
			prod: `cross-env NODE_ENV=production npm start client.buildWP`,
			prodQuick: `cross-env NODE_ENV=production QUICK=true npm start client.buildWP`,
		},

		// rspack (new)
		dev: `cd Packages/client && ${pathToNPMBin("rspack", 2)} serve`,
		compile: `cd Packages/client && ${pathToNPMBin("rspack", 2)} build`,
		build: {
			prod: `cross-env-shell NODE_ENV=production "npm start client.clean && npm start client.compile"`,
		},
	},
	jsCommon: {
		// helps for spotting typescript errors in the "Packages/js-common" (client.dev script can work too, but it's nice to have one just for errors in "common")
		// (not really useful anymore; just use [edit: now non-existent] app-server.dev instead)
		//tsc: "cd Packages/js-common && tsc --noEmit",
		tsc: "tsc --noEmit --project Packages/js-common/tsconfig.json", // must do this way, else tsc output has "../js-common" paths, which "$tsc-watch" problem-matcher resolves relative to repo-root
	},
});
Object.assign(scripts, {
	monitorClient: {
		tsc:         `cd Packages/monitor-client && ${pathToNPMBin("tsc", 2)} --build --watch`,
		tsc_noWatch: `cd Packages/monitor-client && ${pathToNPMBin("tsc", 2)} --build`,
		clean: "cd Packages/monitor-client && shx rm -rf Dist",

		// webpack (old)
		devWP: {
			default: GetServeCommand("dev", "monitor-client"),
			part2: JSScript({pkg: _packagesRootStr}, "monitor-client/Scripts/Bin/Server"),
		},
		//compileWP: TSScript({pkg: "monitor-client"}, "Scripts/Bin/Compile"),
		compileWP: "cd Packages/monitor-client && node --experimental-specifier-resolution=node ./Scripts/Bin/Compile.js",
		buildWP: {
			default: `cross-env-shell "npm start monitorClient.clean && npm start monitorClient.compileWP"`,
			dev: `cross-env NODE_ENV=development npm start monitorClient.buildWP`,
			// non-quick prod builds are broken atm, so disabled
			//prod: `cross-env NODE_ENV=production npm start monitorClient.buildWP`,
			prodQuick: `cross-env NODE_ENV=production QUICK=true npm start monitorClient.buildWP`,
		},

		// rspack (new)
		dev: `cd Packages/monitor-client && ${pathToNPMBin("rspack", 2)} serve`,
		compile: `cd Packages/monitor-client && ${pathToNPMBin("rspack", 2)} build`,
		build: {
			prod: `cross-env-shell NODE_ENV=production "npm start monitorClient.clean && npm start monitorClient.compile"`,
		},
	},
});

// these scripts are currently only needed when working on external (ie. non-debate-map) projects that user the web-vcore package
Object.assign(scripts, {
	wvc: {
		tsc:         `cd Packages/web-vcore && ${pathToNPMBin("tsc", 2)} --build --watch`,
		tsc_noWatch: `cd Packages/web-vcore && ${pathToNPMBin("tsc", 2)} --build`,
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
	console.log("Statuses:\n", entryStrings.join("\n"));
	let result = entryStrings.map(str=>{
		// example source string: "dm-app-server-69b55c8dfc-k5zrq   1/1     Running   0 (6h5m ago)   2d"
		console.log(`Str1:[${str}]`);
		const [sourceStr, name, ready, status, restarts, age] = /^(.+?)\s{3,}(.+?)\s{3,}(.+?)\s{3,}(.+?)\s{3,}(.+?)$/.exec(str);
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
const GetPodName_AppServer = context=>GetPodInfos(context, appNamespace, ["app=dm-app-server"])[0].name;
const GetPodName_NginxGatewayFabric = context=>GetPodInfos(context, "default", ["app.kubernetes.io/name=nginx-gateway-fabric"])[0].name;

/** Gets the k8s context that is selected as the "current" one, in Docker Desktop. */
function K8sContext_Current() {
	return execSync(`kubectl config current-context`).toString().trim();
}
/** Gets the k8s context passed to the current nps script. (for example, "dm-local", if this was run: npm start "db.psql_k8s dm-local") */
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

function GetServeCommand(env_short = null, pkg = "client") {
	const env_long = {dev: "development", prod: "production"}[env_short] ?? env_short;
	return `cross-env-shell ${env_long ? `NODE_ENV=${env_long} ` : ""}_USE_TSLOADER=true NODE_OPTIONS="--max-old-space-size=8192" "npm start ${pkg}.dev.part2"`;
}

//const {nmWatchPaths} = require("./Scripts/NodeModuleWatchPaths.js");
const startBestShellCmd = `sh -c "clear; (bash || ash || sh)"`;
Object.assign(scripts, {
	//"cargo-test": `${SetEnvVarsCmd({RUSTC_BOOTSTRAP: 1})} cargo test`, // for powershell: "$env:RUSTC_BOOTSTRAP = '1'; cargo test"

	"env-ra": `cmd /C "${SetEnvVarsCmd({FOR_RUST_ANALYZER: 1, STRIP_ASYNC_GRAPHQL: 1})} pwsh"`,
	// this lets you do `npm start cargo-check-ra` to get nicely formatted error messages, while keeping the compile cache of rust-analyzer (much faster!)
	"cargo-check-ra": `cmd /C "${SetEnvVarsCmd({FOR_RUST_ANALYZER: 1, STRIP_ASYNC_GRAPHQL: 1})} cargo check --target-dir ./Temp/rust-analyzer-check"`,

	"cargo-test": `cargo test`,
	// gets stuff we might want, from the k8s pods
	kget: {
		"app-server": Dynamic(()=>{
			const localPath = `./Temp/kget_as-rs_${CurrentTime_SafeStr()}`;

			// package up the files we want into a "temp_for_kget" folder, so we can copy the files in one k8s command (see: https://devops.stackexchange.com/a/14563)
			/*const bundleFilesCmd = `sh -c "mkdir -p ./temp_for_kget && cp cargo-timing.html ./temp_for_kget/ && cp ./*profdata ./temp_for_kget/"`;
			execSync(`${KubeCTLCmd(commandArgs[0])} exec -ti -n ${appNamespace} ${GetPodName_AppServer(commandArgs[0])} -c dm-app-server -- ${bundleFilesCmd}`);*/

			const podName = GetPodName_AppServer(commandArgs[0]);
			execSync(`${KubeCTLCmd(commandArgs[0])} cp ${appNamespace}/${podName}:/dm_repo/Packages/app-server/kgetOutput_buildTime/. ${localPath}`);
			console.log(`Files copied from "${podName}" to: ${paths.resolve(localPath)}`);

			OpenFileExplorerToPath(paths.resolve(localPath));

			// now you can do various things with the profiler data; see: https://fasterthanli.me/articles/why-is-my-rust-build-so-slow
		}),

		// before you can use this, install crox and such (see error message below for details)
		lastProfData_prep: Dynamic(()=>{
			/*require("globby")("./Temp/kget_as-rs_*", {onlyFiles: false, stats: true}).then(/** @param {import("globby").Entry[]} folders *#/ folders=>{
				folders.sort((a, b)=>a.stats.ctimeMs - b.stats.ctimeMs);
				const latestKGetFolder = folders.slice(-1)[0];
				const profFile = paths.resolve(latestKGetFolder, "")
			});*/
			// eslint-disable-next-line global-require
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
				OpenFileExplorerToPath(folder);
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
		"app-server": Dynamic(()=>{
			return `${KubeCTLCmd(commandArgs[0])} exec -ti -n ${appNamespace} ${GetPodName_AppServer(commandArgs[0])} -c dm-app-server -- ${startBestShellCmd}`;
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
	const d2 = context == "dm-ovh" ? "2" : "1"; // second-digit of port-numbers (signifying cluster)
	const forDB = `${KubeCTLCmd(context)} -n postgres-operator port-forward ${GetPodName_DB(context)} 5${d2}20:5432`;
	if (commandArgs.includes("onlyDB")) return forDB;

	//const forWebServer = `${KubeCTLCmd(context)} -n ${appNamespace} port-forward ${GetPodName_WebServer(context)} 5${d2}00:80`;
	const forLoadBalancer = `${KubeCTLCmd(context)} -n ${appNamespace} port-forward ${GetPodName_NginxGatewayFabric(context)} 5${d2}00:80`;
	/*const forHKServer = `TODO`;
	const forHKPostgres = `TODO`;*/

	return `concurrently --kill-others --names db,lb "${forDB}" "${forLoadBalancer}"`;
}

const extraTiltArgs = commandArgs.join(" ");
function RunTiltUp_ForSpecificPod(podName, port, tiltfileArgsStr) {
	let command = `${PrepDockerCmd()} ${SetTileEnvCmd()} tilt up ${podName} --stream -f ./Tilt/Main.star --context dm-ovh --port ${port} -- --env prod`;
	if (tiltfileArgsStr) command += ` -- --env prod ${tiltfileArgsStr} ${extraTiltArgs}`;
	//const command_parts = command.split(" ");
	const commandProcess = process.platform === "win32"
		? spawn("cmd", ["/c", command])
		: spawn("bash", ["-c", command]);

	commandProcess.stdout.on("data", chunk=>{
		const str = chunk.toString();
		// exclude logs from other pods
		if (str.includes("│") && !str.includes(`${podName} │`)) return;
		console.log(str.endsWith("\n") ? str.slice(0, -1) : str);
	});
	commandProcess.on("error", e=>{
		console.log("Tilt-up process error output:", e);
	});
	commandProcess.on("exit", ()=>{
		console.log(`Tilt-up process exited.`);
	});
}

// for scripts that are useful to multiple multiple backend packages (server, web-server, etc.)
Object.assign(scripts, {
	backend: {
		// general
		//buildNMOverwrites: `npx file-syncer ${group1} ${group2}`,
		//buildNMOverwrites: `npx file-syncer --from ${nmWatchPaths.map(a=>`"${a}"`).join(" ")} --to NMOverwrites --replacements "node_modules/web-vcore/node_modules/" "node_modules/" --clearAtLaunch`,

		// docker
		dockerPrep: "node Scripts/PrepareDocker.js",
		pulumiUp: `${PrepDockerCmd()} pulumi up`,

		// port-forwarding (standalone; without tilt)
		forward_local: Dynamic(()=>{
			return GetPortForwardCommandsStr("dm-local");
		}),
		forward_remote: Dynamic(()=>{
			return GetPortForwardCommandsStr("dm-ovh");
		}),
		/*k8s_proxyOn8081: Dynamic(()=>{
			console.log("Test");
			return KubeCTLCommand(commandArgs[0], `-n postgres-operator port-forward $(${GetPodNameCmd_DB(commandArgs[0])}) 8081:5432`);
		}),*/

		tiltUp_local:         `${PrepDockerCmd()} ${SetTileEnvCmd()} tilt up   -f ./Tilt/Main.star --context dm-local            -- --env dev                       ${extraTiltArgs}`,
		tiltUp_local_release: `${PrepDockerCmd()} ${SetTileEnvCmd()} tilt up   -f ./Tilt/Main.star --context dm-local            -- --env dev  --compileWithRelease ${extraTiltArgs}`,
		tiltDown_local:       `${PrepDockerCmd()} ${SetTileEnvCmd()} tilt down -f ./Tilt/Main.star --context dm-local            -- --env dev                       ${extraTiltArgs}`,
		tiltUp_ovh:           `${PrepDockerCmd()} ${SetTileEnvCmd()} tilt up   -f ./Tilt/Main.star --context dm-ovh --port 10351 -- --env prod                      ${extraTiltArgs}`, // tilt-port +1, so can coexist with tilt dev-instance
		tiltDown_ovh:         `${PrepDockerCmd()} ${SetTileEnvCmd()} tilt down -f ./Tilt/Main.star --context dm-ovh --port 10351 -- --env prod                      ${extraTiltArgs}`,
		// these are pod-specific tilt-up commands, for when you want to only update a single pod (well technically, that one pod plus all its dependencies, currently -- but still useful to avoid updating other 1st-party pods)
		tiltUp_ovh_webServer:            Dynamic(()=>RunTiltUp_ForSpecificPod("dm-web-server", 10361)), // tilt-port +(10+1), as targeted tilt-up #1
		tiltUp_ovh_appServer:            Dynamic(()=>RunTiltUp_ForSpecificPod("dm-app-server", 10362)), // tilt-port +(10+2), as targeted tilt-up #2
		//tiltUp_ovh_appServer_quicker:  Dynamic(()=>RunTiltUp_ForSpecificPod("dm-app-server", 10362, "--compileWithCranelift")), // tilt-port +(10+2), as targeted tilt-up #2
		//tiltUp_ovh_appServer_quickest: Dynamic(()=>RunTiltUp_ForSpecificPod("dm-app-server", 10362, "--compileWithCranelift --compileWithRelease=False")), // tilt-port +(10+2), as targeted tilt-up #2
		tiltUp_ovh_appServer_optimized:  Dynamic(()=>RunTiltUp_ForSpecificPod("dm-app-server", 10362, "--compileWithCranelift=False")), // tilt-port +(10+2), as targeted tilt-up #2
		tiltUp_ovh_monitorBackend:       Dynamic(()=>RunTiltUp_ForSpecificPod("dm-monitor-backend", 10363)), // tilt-port +(10+3), as targeted tilt-up #3

		// Using tilt to deploy is convenient, but does have some negatives -- biggest one being that pressing "Trigger update" delete the pod, builds, then deploy the pod, leaving a gap/downtime.
		// So provide a way to do a "traditional" `kubectl apply` for the main debate-map pods, which avoids that pod downtime.
		// commented; this does not currently work, because the image needs to be rebuilt for the new code to take effect (maybe just need to find a way to tell Tilt to not delete the pod before the update)
		//k8sApply_dmWebServer_remote: `kubectl --context Packages/web-server/deployment.yaml`

		forceKillNS: Dynamic(()=>{
			const pathToKillScript = paths.resolve("./Scripts/KillKubeNS.sh");
			const pathToKillScript_wsl = pathToKillScript.replace(/\\/g, "/").replace("C:/", "/mnt/c/");
			return `wsl ${pathToKillScript_wsl} ${commandArgs.join(" ")}`;
		}),

		// nginx
		ngGetConf: Dynamic(()=>{
			const context = K8sContext_Arg_Required();
			const str = execSync(`${KubeCTLCmd(context)} exec -ti -n ${appNamespace} ${GetPodName_NginxGatewayFabric(context)} -c nginx -- nginx -T`).toString().trim();
			console.log("Str:", str);
		}),

		// dumps (ie. pg_dump backups)
		// Alternatives:
		// * Run: `node ./Scripts/DBBackups/GQLBackupHelper.js backup` (does basically the same thing as done here, except through the app-server, rather than connecting directly to the pod)
		// * Use DBeaver to make a dump. (see readme for details)
		// * Make a pgbackrest-based backup of the database. (see readme for details)
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
				if (!dbDumpStr.includes("PostgreSQL database dump complete")) {
					console.warn(`WARNING: The DB dump contents appear to have been cut-off before being fully received! (no "database dump complete" message found in file-contents) [consider using GQLBackupHelper.js script instead]`);
				}

				const filePath_rel = `../Others/@Backups/DBDumps_${context}/${CurrentTime_SafeStr()}.sql`;
				const folderPath_rel = paths.dirname(filePath_rel);
				fs.mkdirSync(folderPath_rel, {recursive: true});
				fs.writeFileSync(filePath_rel, dbDumpStr);
				console.log(`DB dump (of context: ${context}) created at: ${paths.resolve(filePath_rel)}`);
				OpenFileExplorerToPath(filePath_rel);
			});
		}),

		// backups
		viewDBBackups: Dynamic(()=>{
			const devEnv = commandArgs[0] == "dev" || K8sContext_Current() == "dm-local";
			const {bucket_dev_uniformPrivate_name, bucket_prod_uniformPrivate_name} = require("./PulumiOutput_Public.json"); // eslint-disable-line
			const bucket_uniformPrivate_name = devEnv ? bucket_dev_uniformPrivate_name : bucket_prod_uniformPrivate_name;
			// this works for links as well on windows; not sure on linux/mac
			OpenFileExplorerToPath(`https://console.cloud.google.com/storage/browser/${bucket_uniformPrivate_name}/db-backups-pgbackrest/backup/db?project=debate-map-prod`);
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
scripts.backend.dockerBuild_gitlab_base = `${PrepDockerCmd()} docker build -f ./Packages/deploy/@JSBase/Dockerfile -t registry.gitlab.com/venryx/debate-map .`;
function SetTileEnvCmd() {
	return SetEnvVarsCmd({
		TILT_WATCH_WINDOWS_BUFFER_SIZE: "65536999",
		//ENVIRONMENT: prod ? "prod" : "dev", // commented; now passed as tilt config (eg. " --env=prod")
		//CONTEXT: context, // commented; tilt script now reads context using k8s_context() func
	});
}

// todo: add function for easily retrieving other "generated within k8s cluster" secrets (eg. dm-jwt-secret-hs256)
function GetK8sPGUserAdminSecretData(context) {
	const fromBase64 = str=>Buffer.from(str, "base64");
	const cm = `kubectl${context ? ` --context ${context}` : ""} get secrets -n postgres-operator debate-map-pguser-admin -o go-template='{{.data}}'`;
	//console.log("CM:", cm);
	// todo: fix that this command fails to run as a vscode build-task, on my linux laptop
	const secretsStr = execSync(cm).toString();
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
			context == "dm-ovh" ? 5220 :
			context == "dm-local" ? 5120 :
			null,
		DB_DATABASE: secret.GetField("dbname"),
		DB_USER: secret.GetField("user"),
		DB_PASSWORD: secret.GetField("password"),
	};
	Object.assign(process.env, newEnvVars);
}

Object.assign(scripts, {
	"web-server": {
		dockerBuild: `${PrepDockerCmd()} docker build -f ./Packages/web-server/Dockerfile -t dm-web-server-direct .`,
		dockerBuild_fullLog: `${PrepDockerCmd()} cross-env DOCKER_BUILDKIT=0 docker build -f ./Packages/web-server/Dockerfile -t dm-web-server-direct .`, // variant which preserves complete log (may increase build time)
		dockerBuild_ignoreCache: `${PrepDockerCmd()} docker build --no-cache -f ./Packages/web-server/Dockerfile -t dm-web-server-direct .`, // with cache disabled
		dockerBuild_gitlab: `${PrepDockerCmd()} docker build -f ./Packages/web-server/Dockerfile -t registry.gitlab.com/venryx/debate-map .`,
	},
});

// todo: clean up the initDB stuff, to be more certain to be safe
function StartPSQLInK8s(context, database = "debate-map", spawnOptions = null, pager = null) {
	noTimings();

	/*const getPasswordCmd = `${KubeCTLCmd(commandArgs[0])} -n postgres-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}')`;
	const password = execSync(getPasswordCmd).toString().trim();

	execSync(`$env:PGPASSWORD=${password}; psql -h localhost -p [5120/5220] -U admin -d debate-map`);
	execSync(`Add-Type -AssemblyName System.Web; psql "postgresql://admin:$([System.Web.HTTPUtility]::UrlEncode("${password}"))@localhost:[5120/5220]/debate-map"`);*/

	//ImportPGUserSecretAsEnvVars(context);
	const secret = GetK8sPGUserAdminSecretData(context);
	//console.log("Got psql secret:", secret, "@password:", secret.GetField("password").toString());

	const argsStr = `-h localhost -p ${context == "dm-ovh" ? 5220 : 5120} -U admin -d ${database}`;

	if (process.platform == "win32") {
		console.log(`=== NOTE: On Windows, execute \`\\encoding UTF8\` prior to running your queries, if you hit the error: \`character with byte sequence 0xf0 0x9f 0xa7 0x9e in encoding "UTF8" has no equivalent in encoding "WIN1252"\``);
	}

	const env = {
		//...process.env,
		//PGDATABASE: "debate-map",
		//PGUSER: "admin",
		PATH: process.env["PATH"],
		PGPASSWORD: secret.GetField("password").toString(),
	};
	if (pager == "less") {
		Object.assign(env, {
			PAGER: "less",
			LESS: "-iMSx4 -FXR",
			LESSCHARSET: "utf-8",
			TERM: "xterm-256color",
		});
	}
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
			const pager = commandArgs.find(a=>a.startsWith("pager:"))?.slice("pager:".length) ?? (process.platform == "win32" ? null : "less");
			console.log("Connecting psql to database:", database);
			const psqlProcess = StartPSQLInK8s(K8sContext_Arg(), database, {stdio: "inherit"}, pager);
		}),
		local_secrets: Dynamic(()=>{
			// we only care about local context data here, so no need to pass context to GetK8sPGUserAdminSecretData
			const secret = GetK8sPGUserAdminSecretData("dm-local");
			console.log("--- Local Secrets ---");
			console.log("PORT:", 5120);
			console.log("DATABASE:", "debate-map");
			console.log("USER:", "admin");
			console.log("PASSWORD:", secret.GetField("password").toString());
		}),

		// db init/seed commands (using psql to run standard .sql files)
		buildSeedDBScript: GetBuildSeedDBScriptCommand(),
		initDB: Dynamic(()=>{
			// first connect to the "postgres" db, to run @CreateDB.sql (this creates the "debate-map" db if it doesn't exist yet)
			const psqlProcess = StartPSQLInK8s(K8sContext_Arg_Required(), "postgres");
			psqlProcess.stdin.write(`\\i ./Scripts/InitDB/@CreateDB.sql\n`);
			psqlProcess.stdin.write(`\\q\n`);

			// on completion of the CreateDB script (without error), run the InitDB script
			psqlProcess.on("close", code=>{
				if (code != 0) return void console.error(`psql process exited with code ${code}`);
				const psqlProcess2 = StartPSQLInK8s(K8sContext_Arg_Required(), "debate-map");
				psqlProcess2.stdin.write(`\\i ./Scripts/InitDB/@InitDB.sql\n`);
				psqlProcess2.stdin.write(`\\q\n`);
			});
		}),
		seedDB: Dynamic(()=>{
			const psqlProcess = StartPSQLInK8s(K8sContext_Arg_Required(), "debate-map");
			psqlProcess.stdin.write(`\\i ./Scripts/SeedDB/@SeedDB.sql\n`);
			psqlProcess.stdin.write(`\\q\n`);
		}),
		seedDB_freshScript: Dynamic(()=>{
			//execSync(`npm start db.buildSeedDBScript`).toString().trim();
			execSync(GetBuildSeedDBScriptCommand(), {stdio: "inherit"});

			/*const psqlProcess = StartPSQLInK8s(K8sContext_Arg_Required(), "debate-map");
			psqlProcess.stdin.write(`\\i ./Scripts/SeedDB/@SeedDB.sql\n`);
			psqlProcess.stdin.write(`\\q\n`);*/
			execSync(`npm start "db.seedDB ${K8sContext_Arg_Required()}"`, {stdio: "inherit"});
		}),

		// db clearing/reset
		// use this to dc sessions, so you can delete the debate-map db, so you can recreate it with the commands above
		dcAllDBSessions_nonK8s: `psql -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE datname = 'debate-map';"`,
		//dcAllDBSessions_k8s: `psql TODO -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE datname = 'debate-map';"`,
		dcAllDBSessions_k8s: Dynamic(()=>{
			const psqlProcess = StartPSQLInK8s(K8sContext_Arg_Required(), "postgres");
			psqlProcess.stdin.write(`SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE datname = 'debate-map';\n`);
			psqlProcess.stdin.write(`\\q\n`);
		}),
		// this script "deletes" the "debate-map" database within the specified k8s-cluster's postgres instance (for safety, it technically renames it rather than deletes it)
		demoteDebateMapDB_k8s: Dynamic(()=>{
			const psqlProcess = StartPSQLInK8s(K8sContext_Arg_Required(), "postgres");
			psqlProcess.stdin.write(`SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE datname = 'debate-map';\n`);
			const newName = `debate-map-old-${CurrentTime_SafeStr()}`;

			console.log("Renaming debate-map database to:", newName);
			psqlProcess.stdin.write(`ALTER DATABASE "debate-map" RENAME TO "${newName}";\n`);
			// if you need to find the list of databases, run query (in psql or DBeaver): SELECT datname FROM pg_database WHERE datistemplate = false;

			psqlProcess.stdin.write(`\\q\n`);
		}),
	},
});

Object.assign(scripts, {
	wvcSync: "node ./Packages/web-vcore/Scripts/@CJS/SyncDepsToOuterProject.js",
	clearTSBuildInfos: Dynamic(()=>{
		const tsBuildInfoFiles = glob.sync("./**/*.tsbuildinfo", {
			ignore: [
				"./node_modules/**",
				"./**/node_modules/**",
			],
		});
		for (const file of tsBuildInfoFiles) {
			console.log("Deleting:", file);
			fs.unlinkSync(file);
		}
	}),
});

function GetBuildSeedDBScriptCommand() {
	// todo: make sure this still works (TSScript function had issue for "dev" script as of 2023-12-31)
	return TSScript({tsConfigPath: "./Scripts/SeedDBGenerator/tsconfig.json"}, `./Scripts/SeedDBGenerator/GenerateSeedDB.ts`);
}