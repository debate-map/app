const fs = require("fs");
const ignoreText_sharedBase_raw = fs.readFileSync("./Packages/deploy/@DockerBase/template.dockerignore").toString();

const {nmWatchPaths_notUnderWVC_base, nmWatchPaths_notUnderWebVCore_butCouldBe} = require("./NodeModuleWatchPaths.js");
const nmWatchPaths_notUnderWVC_asDockerIgnoreText = [
	...nmWatchPaths_notUnderWVC_base.map(path=>`!/${path}`),
	...nmWatchPaths_notUnderWebVCore_butCouldBe.map(path=>`!**/${path}`),
].join("\n");
const ignoreText_sharedBase_final = ignoreText_sharedBase_raw.replace("# [[[PLACEHOLDER FOR NODE_MODULES WATCH PATHS]]]", nmWatchPaths_notUnderWVC_asDockerIgnoreText);

const dockerPackages = ["Packages/deploy/@DockerBase", "Packages/server", "Packages/web-server"];
for (const path of dockerPackages) {
	let ignoreText_packageSpecific = fs.readFileSync(`${path}/template.dockerignore`).toString();
	if (path == "Packages/deploy/@DockerBase") {
		ignoreText_packageSpecific = null;
	}
	const ignoreText_final = [
		"# =============================================================",
		"# =============================================================",
		"# ========== THIS IS A GENERATED FILE; DO NOT MODIFY ==========",
		"# =============================================================",
		"# =============================================================",
		"# (Instead, modify the template.dockerignore files, then run `npm start backend.dockerPrep`; or just run one of the docker-related commands in package-scripts.js.)",
		"",
		"# ==========================================================================================",
		"# ========== SECTION FROM Packages/deploy/@DockerBase/template.dockerignore BELOW ==========",
		"# ==========================================================================================",
		"",
		ignoreText_sharedBase_final,
		...ignoreText_packageSpecific == null ? [] : [
			"",
			"# ===========================================================================",
			"# ========== SECTION FROM Packages/XXX/template.dockerignore BELOW ==========",
			"# ===========================================================================",
			"",
			ignoreText_packageSpecific,
		],
	].join("\n");
	if (!fs.existsSync(`${path}/.dockerignore`) || ignoreText_final != fs.readFileSync(`${path}/.dockerignore`)) {
		fs.writeFileSync(`${path}/.dockerignore`, ignoreText_final);
		console.log("Updated .dockerignore file.");
	}
}