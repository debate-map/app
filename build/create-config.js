const debug = require("debug")("app:build:config");
const fs = require("fs");
const path = require("path");
const pkg = require("../package.json");
const config = require("../config");

const pathRel = config.globals.__DEV__ ? "Source/BakedConfig_Dev.ts" : "Source/BakedConfig_Prod.ts";
const outputPath = path.join(__dirname, "..", pathRel);

// TODO: load config from environments
/*let env = config.env;
if (process.env.TRAVIS_PULL_REQUEST === false) {
	if (process.env.TRAVIS_BRANCH === "prod")
		env = "production";
}*/

function createConfigFile(cb) {
	const configObj = {
		version: pkg.version,
		firebaseConfig: config.firebase,
		env: config.env,
		devEnv: config.globals.__DEV__,
		prodEnv: config.globals.__PROD__,
		testEnv: config.globals.__TEST__,
	};

	const fileString = Object.keys(configObj).map(key=> {
		return `export const ${key} = ${JSON.stringify(configObj[key])};`;
	}).join("\n");

	fs.writeFile(outputPath, fileString, "utf8", (err) => {
		if (err) {
			debug("Error writing config file:", err);
			if (cb) cb(err, null);
			return;
		}
		if (cb) cb();
	})
}

(function () {
	createConfigFile(() => {
		debug("Config file successfully written to " + pathRel);
	})
})();