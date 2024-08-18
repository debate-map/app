import rspack /*, {Configuration}*/ from "@rspack/core";
import path from "path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import historyApiFallback from "connect-history-api-fallback";

const require = createRequire(import.meta.url);

const ENV_LONG = process.env.NODE_ENV;
const ENV = ENV_LONG === "production" ? "prod" : "dev";

const PORT = process.env.PORT;

const QUICK = process.env.QUICK == "true";
const PROD = ENV == "prod";
const DEV = ENV == "dev";
const TEST = false; //ENV == "test";

/** @type {import('@rspack/core').Configuration} */
const buildBaseConfig /*: Configuration*/ = root=>({
	mode: PROD && !QUICK ? "production" : "development",
	optimization: {
		moduleIds: "named",
		usedExports: false,
		concatenateModules: false,
		mangleExports: false,
		minimizer: [
			new rspack.SwcJsMinimizerRspackPlugin({
				minimizerOptions: {
					// todo: switch back to this more precisely-tuned mangling, once swc's minifier applies it correctly (it ignores the keep_classnames subfield)
					/*mangle: {
						keep_classnames: true,
						reserved: ["makeObservable", "observer"],
					},*/
					mangle: false,
				},
			}),
			new rspack.LightningCssMinimizerRspackPlugin({}),
		],
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
		port: PORT,
		static: [
			{
				directory: path.resolve(root, "./Resources"),
			},
		],
		historyApiFallback: {
			index: "index.html",
			verbose: true,
		},
	},
	target: "web",
	devtool: PROD ? "source-map" : "cheap-source-map",
	resolve: {
		roots: [
			path.resolve(root, "./Resources"),
		],
		modules: [
			"node_modules",
			path.resolve(root, "./Resources"),
			path.resolve(root, "./Source"),
		],
		extensions: [".js", ".jsx", ".json", ".ts", ".tsx", ".mjs"],
		extensionAlias: {
			".js": [".ts", ".js", ".tsx", ".jsx"],
		},
		fallback: {
			fs: path.resolve(root, "../../node_modules/stream-browserify/index.js"),
			stream: path.resolve(root, "../../node_modules/stream-browserify/index.js"),
		},
		tsConfig: {
			configFile: path.resolve(root, "./tsconfig.json"),
			references: [path.resolve(root, "../../tsconfig.base.json")],
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
								includePaths: [path.resolve(root, "./Source")],
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
	output: {
		filename: "[name].js",
		path:  path.resolve(root, "./Dist"),
	},
	plugins: [
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
					from: path.resolve(root, "./Resources"),
					to: path.resolve(root, "./Dist"),
					globOptions: {
						ignore: ["**/index.html"],
					},
				},
			],
		}),
	],
});

// alias for stringify; we have to stringify/wrap-with-quotes the global-var names (ie. make them json), because that's what webpack.DefinePlugin expects
function S(obj) {
	return JSON.stringify(obj);
}

/**
 * 
 * @param {import('@rspack/core').Configuration} config 
 * @returns 
 */
export const buildConfig = (root, config)=>{
	const baseConfig = buildBaseConfig(root);

	const devServer = {
		...baseConfig.devServer,
		...config.devServer,
		static: [
			...baseConfig.devServer.static ?? [],
			...config.devServer.static ?? [],
		],
		historyApiFallback: {
			...baseConfig.devServer.historyApiFallback,
			...config.devServer.historyApiFallback,
			rewrites: [
				...baseConfig.devServer.historyApiFallback.rewrites ?? [],
				...config.devServer.historyApiFallback.rewrites ?? [],
			],
		},
	};

	const resolve = {
		...baseConfig.resolve,
		...config.resolve,
		roots: [
			...baseConfig.resolve.roots ?? [],
			...config.resolve.roots ?? [],
		],
	};

	const plugins = [
		...baseConfig.plugins,
		...config.plugins,
	];

	const entry = {
		...baseConfig.entry,
		...config.entry,
	};

	return {
		...baseConfig,
		...config,
		devServer: {
			...devServer,
		},
		resolve: {
			...resolve,
		},
		plugins: [
			...plugins,
		],
		entry: {
			...entry,
		},
	};
};

export const historyRewrite = root=>{
	return {
		// from: /^\/monitor\/.*$/,
		from: new RegExp(`^${root}.*$`),
		to(context) {
			if (context.parsedUrl.pathname.match(/\.[a-z]+$/)) {
				return `/${context.parsedUrl.pathname.split("/").pop()}`;
			}
			return "/index.html";
		},
	};
};

export const staticDirs = (root, dirs)=>{
	return dirs.map(dir=>({
		directory: path.resolve(root, dir),
	}));
};

export const rootDirs = (root, dirs)=>{
	return dirs.map(dir=>path.resolve(root, dir));
};