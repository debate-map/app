// @ts-check

import {buildConfig} from "web-vcore/Scripts/RsPack/rspack.js";
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
config.resolve["alias"] = {
	"wavesurfer.js": path.resolve(__dirname, "../../node_modules/wavesurfer.js/dist/wavesurfer.js"),
};
export default config;