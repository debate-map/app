const debug = require("debug")("app:build:config");
const fs = require("fs");
const path = require("path");
const pkg = require("../package.json");
const outputPath = path.join(__dirname, "..", "Source/Config.ts");
const config = require("../config");

function createConfigFile(cb) {
	const configObj = {
		version: pkg.version,
		env: "development",
		firebase: config.firebase
	};

	// TODO: load config from environments
	if (process.env.TRAVIS_PULL_REQUEST === false) {
		if (process.env.TRAVIS_BRANCH === "prod") {
			configObj.env = "production";
		}
	}

	const fileString = `export const firebase = ${JSON.stringify(configObj.firebase, null, 2)}\n` +
		"\n// Config for react-redux-firebase" +
		"\n// For more details, visit https://prescottprue.gitbooks.io/react-redux-firebase/content/config.html" +
		`\nexport const env = ${JSON.stringify(configObj.env)}\n` +
		`\nexport default { firebase, env }\n`;

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
		debug("Config file successfully written to Source/Config.ts");
	})
})();