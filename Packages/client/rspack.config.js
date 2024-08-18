import {historyRewrite, buildConfig, staticDirs, rootDirs} from "web-vcore/Scripts/RsPack/rspack.js";
import {rspack} from "@rspack/core";
import path from "path";
import {fileURLToPath} from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const config = buildConfig(rootDir, {
	name: "client",
	devServer: {
		port: 5101,
		historyApiFallback: {
			rewrites: [
				historyRewrite("/"),
			],
		},
	},
	resolve: {
		roots: rootDirs(rootDir, ["../client/Resources"]),
		alias: {
			"wavesurfer.js": rootDirs(rootDir, ["../../node_modules/wavesurfer.js/dist/wavesurfer.js"]),
		},
	},
	plugins: [
		new rspack.HtmlRspackPlugin({
			template: "./Source/index.html",
			filename: "index.html",
			inject: "body",
			publicPath: "/", // ensure app.js is always requested from the "/monitor/" path
		}),
	],
	entry: {
		app: rootDirs(rootDir, ["./Source/Main.ts"]),
	},
});

export default config;