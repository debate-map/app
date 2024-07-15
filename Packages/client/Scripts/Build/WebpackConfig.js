import {CreateWebpackConfig} from "web-vcore/Scripts_Dist/Build/WebpackConfig.js";
import {createRequire} from "module";
import TerserPlugin from "terser-webpack-plugin";
import {DEV, QUICK} from "web-vcore/Scripts_Dist/EnvVars/ReadEnvVars.js";
import {config} from "../Config.js";
import {npmPatch_replacerConfig} from "./NPMPatches.js";

const require = createRequire(import.meta.url);

// modify the imported config-base, then return it (that's fine/intended)
export const webpackConfig = CreateWebpackConfig({
	config,
	npmPatch_replacerConfig,
	name: "client",
	ext_deep: {
		resolve: {
			fallback: {
				stream: require.resolve("stream-browserify"),
			},
		},
		optimization: DEV ? undefined : {
			minimize: !QUICK,
			mangleExports: false,
			minimizer: [
				new TerserPlugin({
					minify: TerserPlugin.terserMinify,
					terserOptions: {
						keep_classnames: true,
						mangle: {
							reserved: [
								"makeObservable",
								"observer",
							],
						},
					},
				}),
			],
		},
	},
});