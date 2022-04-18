const fs = require("fs");

PrepareYarnLockFile();
PrepareDockerIgnoreFiles();

function PrepareYarnLockFile() {
	const lockText = fs.readFileSync("./yarn.lock");
	fs.writeFileSync("./Others/yarn-lock-for-docker.lock", lockText);
}

function PrepareDockerIgnoreFiles() {
	const ignoreText_sharedBase_raw = fs.readFileSync("./templateBase.dockerignore").toString();

	// we don't need this replacement anymore! node_modules can be wholly ignored by all docker-images, given the existence of NMOverwrites
	/*const {nmWatchPaths_notUnderWVC_base, nmWatchPaths_notUnderWebVCore_butCouldBe} = require("./NodeModuleWatchPaths.js");
	const nmWatchPaths_notUnderWVC_asDockerIgnoreText = [
		...nmWatchPaths_notUnderWVC_base.map(path=>`!/${path}`),
		...nmWatchPaths_notUnderWebVCore_butCouldBe.map(path=>`!**###/${path}`),
	].join("\n");
	const ignoreText_sharedBase_final = ignoreText_sharedBase_raw.replace("# [[[PLACEHOLDER FOR NODE_MODULES WATCH PATHS]]]", nmWatchPaths_notUnderWVC_asDockerIgnoreText);*/
	const ignoreText_sharedBase_final = ignoreText_sharedBase_raw;

	const dockerPackages = [
		// js
		"Packages/deploy/@JSBase",
		"Packages/web-server",
		"Packages/app-server",
		// rust
		"Packages/deploy/@RustBase",
		"Packages/monitor-backend",
		"Packages/app-server-rs",
	];
	for (const path of dockerPackages) {
		const ignoreText_packageSpecific = fs.readFileSync(`${path}/template.dockerignore`).toString();
		const ignoreText_final = [
			"# =============================================================",
			"# =============================================================",
			"# ========== THIS IS A GENERATED FILE; DO NOT MODIFY ==========",
			"# =============================================================",
			"# =============================================================",
			"# (Instead, modify the template.dockerignore files, then run `npm start backend.dockerPrep`; or just run one of the docker-related commands in package-scripts.js.)",
			"",
			"# ==================================================================",
			"# ========== SECTION FROM templateBase.dockerignore BELOW ==========",
			"# ==================================================================",
			"",
			ignoreText_sharedBase_final,
			"",
			"# ===========================================================================",
			"# ========== SECTION FROM Packages/XXX/template.dockerignore BELOW ==========",
			"# ===========================================================================",
			"",
			ignoreText_packageSpecific,
		].join("\n");
		//const dockerIgnorePath = `${path}/.dockerignore`;
		const dockerIgnorePath = `${path}/Dockerfile.dockerignore`;
		if (!fs.existsSync(dockerIgnorePath) || ignoreText_final != fs.readFileSync(dockerIgnorePath)) {
			fs.writeFileSync(dockerIgnorePath, ignoreText_final);
			console.log(`Updated: ${dockerIgnorePath}`);
		}
	}
}