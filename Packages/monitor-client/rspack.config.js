import {historyRewrite, buildConfig, staticDirs, rootDirs} from "web-vcore/Scripts/RsPack/rspack.js";
import {rspack} from "@rspack/core";
import path from "path";
import {fileURLToPath} from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const config = buildConfig(rootDir, {
	name: "monitor-client",
	devServer: {
		port: 5131,
		static: staticDirs(rootDir, ["../client/Resources"]),
		historyApiFallback: {
			rewrites: [
				historyRewrite("/monitor/"),
			],
		},
	},
	resolve: {
		roots: rootDirs(rootDir, ["../client/Resources"]),
	},
	plugins: [
		new rspack.HtmlRspackPlugin({
			template: "./Source/index.html",
			filename: "index.html",
			inject: "body",
			publicPath: "/monitor/", // ensure app.js is always requested from the "/monitor/" path
		}),
	],
	entry: {
		app: rootDirs(rootDir, ["./Source/Main.tsx"]),
	},
});

export default config;