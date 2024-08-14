import rspack /*, {Configuration}*/ from "@rspack/core";
import path from "path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const ENV_LONG = process.env.NODE_ENV;
const ENV = ENV_LONG === "production" ? "prod" : "dev";

const QUICK = process.env.QUICK == "true";
const PROD = ENV == "prod";
const DEV = ENV == "dev";
const TEST = false; //ENV == "test";

const OUTPUT_PATH = path.resolve(__dirname, "./Dist");

/** @type {import('@rspack/core').Configuration} */
const config /*: Configuration*/ = {
	name: "client",
	mode: PROD && !QUICK ? "production" : "development",
	optimization: {
		moduleIds: "named",
		usedExports: false,
		concatenateModules: false,
	},
	devServer: {
		devMiddleware: {
			stats: {
				colors: true,
				chunks: false, // only on prod,
				chunkModules: false, // only on prod,
			},
			writeToDisk: true,
		},
		port: 5101,
		static: [
			{
				directory: path.resolve(__dirname, "./Resources"),
			},
		],
		historyApiFallback: {
			index: "index.html",
			verbose: true,
			rewrites: [
				{
					from: /^\/.*$/,
					to(context) {
						if (context.parsedUrl.pathname?.match(/\.[a-z]+$/)) {
							return `/${context.parsedUrl.pathname.split("/").pop()}`;
						}
						return "/index.html";
					},
				},
			],
		},
	},
	target: "web",
	//devtool: PROD ? "source-map" : "cheap-source-map",
	devtool: "source-map",
	resolve: {
		roots: [path.resolve(__dirname, "./Resources")],
		modules: [
			"node_modules",
			path.resolve(__dirname, "./Resources"),
			path.resolve(__dirname, "./Source"),
		],
		extensions: [".js", ".jsx", ".json", ".ts", ".tsx", ".mjs"],
		alias: {
			"wavesurfer.js": [path.resolve(__dirname, "../../node_modules/wavesurfer.js/dist/wavesurfer.js")],
		},
		extensionAlias: {
			".js": [".ts", ".js", ".tsx", ".jsx"],
		},
		fallback: {
			fs: path.resolve(__dirname, "../../node_modules/stream-browserify/index.js"),
			stream: path.resolve(__dirname, "../../node_modules/stream-browserify/index.js"),
		},
		tsConfig: {
			configFile: path.resolve(__dirname, "./tsconfig.json"),
			references: [path.resolve(__dirname, "../../tsconfig.base.json")],
		},
	},
	experiments: {
		css: true,
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
									decorators: true,
								},
							},
						},
					},
				],
			},
			{
				test: /\.(sa|sc|c)ss$/,
				use: [
					{
						loader: "sass-loader",
						options: {
							// using `modern-compiler` and `sass-embedded` together significantly improve build performance
							api: "modern-compiler",
							implementation: require.resolve("sass-embedded"),

							sassOptions: {
								includePaths: [path.resolve(__dirname, "./Source")],
							},
						},
					},
				],
				type: "css",
			},
			{
				test: /\.woff(\?.*)?$/,
				type: "asset/inline",
			},
			{
				test: /\.woff2(\?.*)?$/,
				type: "asset/inline",
			},
			{
				test: /\.otf(\?.*)?$/,
				type: "asset/resource",
			},
			{
				test: /\.ttf(\?.*)?$/,
				type: "asset/inline",
			},
			{
				test: /\.eot(\?.*)?$/,
				type: "asset/resource",
			},
			{
				test: /\.(png|jpg)$/,
				type: "asset/inline",
			},
			{
				test: /\.svg$/,
				loader: "svg-sprite-loader",
			},
		],
	},
	externals: {
		fs: "root location",
		"/Fonts/AdobeNotDef-Regular.otf": "root location",
	},
	entry: {
		app: [path.resolve(__dirname, "./Source/Main.ts")],
	},
	output: {
		filename: "[name].js",
		path: OUTPUT_PATH,
	},
	plugins: [
		new rspack.HtmlRspackPlugin({
			template: "./Source/index.html",
			filename: "index.html",
			inject: "body",
			minify: false,
		}),
		new rspack.ProgressPlugin({}),
		new rspack.DefinePlugin({
			// all compile-time instances of these fields get replaced with constants
			"globalThis.ENV": S(ENV),
			"globalThis.DEV": S(DEV),
			"globalThis.PROD": S(PROD),
			"globalThis.TEST": S(TEST),
			// in the root project, the `globalThis.` part may be left out
			ENV: S(ENV),
			DEV: S(DEV),
			PROD: S(PROD),
			TEST: S(TEST),

			// DON'T EVER USE THESE (use ones above instead -- to be consistent); we only include them in case libraries use them (such as redux)
			// ==========

			NODE_ENV: S(ENV_LONG),
			// this version is needed, for "process.env.XXX" refs from libs we don't care about (else runtime error)
			"process.env": {
				NODE_ENV: S(ENV_LONG),
			},
			//"process.env.NODE_ENV": S(ENV_LONG), // edit: why the above, instead of this?
			...{
				__DEV__: S(DEV),
				__PROD__: S(PROD),
				__TEST__: S(TEST),
			},
			//"__COVERAGE__": !argv.watch ? S(TEST) : null,
			//"__BASENAME__": S(BASENAME),
		}),
		new rspack.CopyRspackPlugin({
			patterns: [
				{
					from: path.resolve(__dirname, "./Resources"),
					to: OUTPUT_PATH,
					globOptions: {
						ignore: ["**/index.html"],
					},
				},
			],
		}),
	],
};

// alias for stringify; we have to stringify/wrap-with-quotes the global-var names (ie. make them json), because that's what webpack.DefinePlugin expects
function S(obj) {
	return JSON.stringify(obj);
}

export default config;