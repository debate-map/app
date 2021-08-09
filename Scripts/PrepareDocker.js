const fs = require("fs");
const dockerIgnoreText_base = fs.readFileSync("./template.dockerignore").toString();

const nodeModuleWatchPaths = require("./NodeModuleWatchPaths.js").default;
const nodeModuleWatchPaths_asDockerIgnoreText = nodeModuleWatchPaths.map(path=>{
	return `!${path}`;
}).join("\n");

const dockerIgnoreText_final = [
	"# =============================================================",
	"# =============================================================",
	"# ========== THIS IS A GENERATED FILE; DO NOT MODIFY ==========",
	"# =============================================================",
	"# =============================================================",
	"# (Instead, modify template.dockerignore, then run `npm start dockerUpdateFiles`; or just run one of the docker-related commands in package-scripts.js.)",
	"",
	dockerIgnoreText_base.replace("# [[[PLACEHOLDER FOR NODE_MODULES WATCH PATHS]]]", nodeModuleWatchPaths_asDockerIgnoreText),
].join("\n");
if (dockerIgnoreText_final != dockerIgnoreText_base) {
	fs.writeFileSync("./.dockerignore", dockerIgnoreText_final);
	console.log("Updated .dockerignore file.");
}