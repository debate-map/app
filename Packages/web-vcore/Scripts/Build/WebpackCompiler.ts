import webpack from "webpack";
import debug_base from "debug";
import type {CreateConfig_ReturnType} from "../Config";

const debug = debug_base("app:build:webpack-compiler");

export function StartWebpackCompiler(config: CreateConfig_ReturnType, webpackConfig: webpack.Configuration, statsFormat?): Promise<webpack.StatsCompilation> {
	statsFormat = statsFormat || config.compiler_stats;

	return new Promise((resolve, reject)=>{
		const compiler = webpack(webpackConfig);

		compiler.run((err, stats)=>{
			if (err) {
				debug("Webpack compiler encountered a fatal error.", err);
				return reject(err);
			}

			const jsonStats: webpack.StatsCompilation = stats!.toJson();
			debug("Webpack compile completed.");
			debug(stats!.toString(statsFormat));

			const errorsAsStr = jsonStats.errors!.map(a=>JSON.stringify(a, null, "\t")).join("\n");
			const warningsAsStr = jsonStats.warnings!.map(a=>JSON.stringify(a, null, "\t")).join("\n");

			if (jsonStats.errors!.length > 0) {
				debug("Webpack compiler encountered errors.");
				debug(errorsAsStr);
				return reject(new Error(`Webpack compiler encountered errors:\n${errorsAsStr}`));
			}
			if (jsonStats.warnings!.length > 0) {
				debug("Webpack compiler encountered warnings.");
				debug(warningsAsStr);
			}
			if (errorsAsStr.length == 0 && warningsAsStr.length == 0) {
				debug("No errors or warnings encountered.");
			}
			resolve(jsonStats);
		});
	});
}