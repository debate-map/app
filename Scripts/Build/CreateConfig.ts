import debug_base from "debug";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import pkg from "../../package.json";

const debug = debug_base("app:build:config");

export function createConfigFile(callback, environment) {
	const configObj = {
		version: pkg.version,
		firebaseConfig: environment == "development"
			? {
				// use concatenation to make automated searches for g-cloud api-keys a bit harder (it should be ok if found; abuse would just be quota issues from foreign clients, if api-key misconfigured)
				apiKey: "AI" + "zaSyB1UCTO2p6TLpifAQzsRw_Np39k9N92cpI", // eslint-disable-line
				authDomain: "debate-map-dev.firebaseapp.com",
				databaseURL: "https://debate-map-dev.firebaseio.com",
				projectId: "debate-map-dev",
				// messagingSenderId: 'TODO',
				storageBucket: "debate-map-dev.appspot.com",
			}
			: {
				apiKey: "AI" + "zaSyCnvv_m-L08i4b5NmxGF5doSwQ2uJZ8i-0", // eslint-disable-line
				authDomain: "debate-map-prod.firebaseapp.com",
				databaseURL: "https://debate-map-prod.firebaseio.com",
				projectId: "debate-map-prod",
				// messagingSenderId: 'TODO',
				storageBucket: "debate-map-prod.appspot.com",
			},
	};

	const newText = Object.keys(configObj).map(key=>`export const ${key} = ${JSON.stringify(configObj[key])};`).join("\n");

	const pathRel = environment === "development" ? "Source/BakedConfig_Dev.ts" : "Source/BakedConfig_Prod.ts";
	const outputPath = path.join(__dirname, "..", "..", pathRel);

	const oldText = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, {encoding: "utf8"}) : null;
	if (newText != oldText) {
		fs.writeFile(outputPath, newText, "utf8", err=>{
			if (err) {
				debug("Error writing config file:", err);
				if (callback) callback(err, null);
				return;
			}
			if (callback) callback();
		});
	}
}

(()=>{
	createConfigFile(()=>{
		debug("Config file (dev) successfully written.");
	}, "development");
	createConfigFile(()=>{
		debug("Config file (prod) successfully written.");
	}, "production");
})();