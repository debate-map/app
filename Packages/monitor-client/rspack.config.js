// @ts-check

import {NN, buildConfig} from "web-vcore/Scripts/RsPack/rspack.js";
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

// hot/live reloading disabled, so that accidental reloads (causing loss of debugging context) don't happen (this should be customizable per-dev in the future)
NN(config.devServer).hot = false;
NN(config.devServer).liveReload = false;

export default config;