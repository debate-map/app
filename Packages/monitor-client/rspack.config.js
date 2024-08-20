// @ts-check

import {buildConfig} from "web-vcore/Scripts/RsPack/rspack.js";
import path from "path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = buildConfig({
	name: "monitor-client",
	port: 5131,
	publicPath: "/monitor/",
	rootDir: __dirname,
	entryFile: path.resolve(__dirname, "./Source/Main.tsx"),
	dotEnvFile: path.resolve(__dirname, "../../.env"),
	resourceDirs: [
		path.resolve(__dirname, "./Resources"),
		path.resolve(__dirname, "../client/Resources"),
	],
});
export default config;