const debug = require("debug")("app:build:config");
const fs = require("fs");
const path = require("path");
const pkg = require("../package.json");
const config = require("../config");

// TODO: load config from environments
/*let env = config.env;
if (process.env.TRAVIS_PULL_REQUEST === false) {
	if (process.env.TRAVIS_BRANCH === "prod")
		env = "production";
}*/

function createConfigFile(callback, environment) {
	let configObj = {
		version: pkg.version,
		//dbVersion: 5,
		firebaseConfig: environment == "development"
			? {
				apiKey: "AIzaSyB1UCTO2p6TLpifAQzsRw_Np39k9N92cpI",
				authDomain: "debate-map-dev.firebaseapp.com",
				databaseURL: "https://debate-map-dev.firebaseio.com",
				storageBucket: "debate-map-dev.appspot.com"
			}
			: {
				apiKey: "AIzaSyCnvv_m-L08i4b5NmxGF5doSwQ2uJZ8i-0",
				authDomain: "debate-map-prod.firebaseapp.com",
				databaseURL: "https://debate-map-prod.firebaseio.com",
				storageBucket: "debate-map-prod.appspot.com"
			},
		/*env: config.env,
		devEnv: config.globals.__DEV__,
		prodEnv: config.globals.__PROD__,
		testEnv: config.globals.__TEST__,*/
	};

	let fileString = Object.keys(configObj).map(key=> {
		return `export const ${key} = ${JSON.stringify(configObj[key])};`;
	}).join("\n");

	let pathRel = environment == "development" ? "Source/BakedConfig_Dev.ts" : "Source/BakedConfig_Prod.ts";
	let outputPath = path.join(__dirname, "..", pathRel);

	fs.writeFile(outputPath, fileString, "utf8", (err) => {
		if (err) {
			debug("Error writing config file:", err);
			if (callback) callback(err, null);
			return;
		}
		if (callback) callback();
	})
}

(()=> {
	createConfigFile(()=> {
		debug("Config file (dev) successfully written.");
	}, "development")
	createConfigFile(()=> {
		debug("Config file (prod) successfully written.");
	}, "production")
})();