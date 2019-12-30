import fs from "fs-extra";
import debug_base from "debug";
import {webpackCompiler} from "../Build/WebpackCompiler";
import {webpackConfig} from "../Build/WebpackConfig";
import {config} from "../Config";

const debug = debug_base("app:bin:compile");
const paths = config.utils_paths;

const compile = ()=>{
	debug("Starting compiler.");
	return Promise.resolve()
		.then(()=>webpackCompiler(webpackConfig))
		.then(stats=>{
			if (stats.warnings.length && config.compiler_fail_on_warning) {
				throw new Error("Config set to fail on warning, exiting with status code '1'.");
			}
			debug("Copying resources to Dist folder.");
			// fs.copySync(paths.source("Resources"), paths.dist());
			fs.copySync(paths.base("Resources"), paths.dist());
		})
		.then(()=>{
			debug("Compilation completed successfully.");
		})
		.catch(err=>{
			debug("Compiler encountered an error.", err);
			process.exit(1);
		});
};

compile();