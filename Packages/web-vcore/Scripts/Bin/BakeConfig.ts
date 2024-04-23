import debug_base from "debug";
import fs from "fs";
import type {CreateConfig_ReturnType} from "../Config";

const debug = debug_base("app:build:config");

export function CreateBakedConfigFile(config: CreateConfig_ReturnType, environment: "dev" | "prod", configObj) {
	const newText = Object.keys(configObj).map(key=>`export const ${key} = ${JSON.stringify(configObj[key])};`).join("\n");

	const outputPath = config.utils_paths.base(environment === "dev" ? "Source/BakedConfig_Dev.ts" : "Source/BakedConfig_Prod.ts");

	const oldText = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, {encoding: "utf8"}) : null;
	if (newText != oldText) {
		fs.writeFile(outputPath, newText, "utf8", err=>{
			if (err) {
				debug("Error writing config file:", err);
				return;
			}
			debug(`Config file (${environment}) successfully written.`);
		});
	}
}