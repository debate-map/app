const rspack = require("@rspack/core");
const {DefinePlugin} = require("@rspack/core");

/** @type {import('@rspack/core').Configuration} */
const config = {
	name: "monitor-client",
	mode: "development",
	optimization: {
		moduleIds: "named",
		usedExports: false,
		concatenateModules: false,
	},
	devServer: {
		port: 5130,
	},
	target: "web",
	devtool: "cheap-source-map",
	resolve: {
		modules: ["node_modules", "./Source"],
		extensions: [".js", ".jsx", ".json", ".ts", ".tsx", ".mjs"],
		fallback: {
			stream: "../../stream-browserify/index.js",
		},
		tsConfig: {
			configFile: "./tsconfig.json",
		},
	},
	module: {
		rules: [
			{
				test: /\.(ts?|tsx?|.js)$/,
				use: [
					{
						loader: "builtin:swc-loader",
						/**
						 * @type {import('@rspack/core').SwcLoaderOptions}
						 */
						options: {
							jsc: {
								parser: {
									syntax: "typescript",
								},
							},
						},
					},
				],
			},
		],
	},
	externals: {fs: "root location"},
	entry: {
		app: ["./Source/Main.tsx"],
	},
	plugins: [
		new rspack.HtmlRspackPlugin({
			template: "./Source/index.html",
		}),
		new DefinePlugin({
			definitions: {
				"globalThis.ENV": '"dev"',
				"globalThis.DEV": "true",
				"globalThis.PROD": "false",
				"globalThis.TEST": "false",
				ENV: '"dev"',
				DEV: "true",
				PROD: "false",
				TEST: "false",
				NODE_ENV: '"development"',
				"process.env": {NODE_ENV: '"development"'},
				__DEV__: "true",
				__PROD__: "false",
				__TEST__: "false",
			},
		}),
	],
};

module.exports = config;
