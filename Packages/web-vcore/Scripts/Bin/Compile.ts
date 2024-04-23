import fs from "fs-extra";
import debug_base from "debug";
import webpack from "webpack";
import pathModule from "path";
import {StartWebpackCompiler} from "../Build/WebpackCompiler.js";
import type {CreateConfig_ReturnType} from "../Config.js";

const debug = debug_base("app:bin:compile");

export function Compile(config: CreateConfig_ReturnType, webpackConfig: webpack.Configuration) {
	const paths = config.utils_paths;
	debug("Starting compiler.");
	return Promise.resolve()
		.then(()=>StartWebpackCompiler(config, webpackConfig))
		.then(stats=>{
			if (stats.warnings!.length && config.compiler_fail_on_warning) {
				throw new Error("Config set to fail on warning, exiting with status code '1'.");
			}
			debug("Copying resources to Dist folder. Resource folders:", config.resourceFolders, "Resource files:", config.resourceFiles);
			for (const resourceFolder of config.resourceFolders) {
				fs.copySync(
					paths.base(resourceFolder.sourcePath),
					//paths.dist(resourceFolder.destSubpath ?? ""),
					paths.dist(),
				);
			}
			for (const resourceFile of config.resourceFiles) {
				const fileName = pathModule.basename(resourceFile.sourcePath);
				fs.copySync(
					paths.base(resourceFile.sourcePath),
					paths.dist(resourceFile.destSubpath ?? fileName),
				);
			}
		})
		.then(()=>{
			debug("Compilation completed successfully.");
		})
		.catch(err=>{
			//debug("Compiler encountered an error.", err);
			console.error("Compiler encountered an error:", err);
			process.exit(1);
		});
}