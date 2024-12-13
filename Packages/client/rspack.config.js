// @ts-check

import {buildConfig, NN} from "web-vcore/Scripts/RsPack/rspack.js";
import path from "path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = buildConfig({
	name: "client",
	port: 5101,
	publicPath: "/",
	rootDir: __dirname,
	entryFile: path.resolve(__dirname, "./Source/Main.ts"),
	dotEnvFile: path.resolve(__dirname, "../../.env"),
});

// hot/live reloading disabled, so that accidental reloads (causing loss of debugging context) don't happen (this should be customizable per-dev in the future)
NN(config.devServer).hot = false;
NN(config.devServer).liveReload = false;

NN(config.resolve).alias = {
	"wavesurfer.js": path.resolve(__dirname, "../../node_modules/wavesurfer.js/dist/wavesurfer.js"),
};
export default config;