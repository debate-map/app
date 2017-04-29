const webpack = require("webpack");
const cssnano = require("cssnano");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
var BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const config = require("../config");
const debug = require("debug")("app:webpack:config");
var path = require("path");

const paths = config.utils_paths;
const {__DEV__, __PROD__, __TEST__} = config.globals;
const {QUICK_DEPLOY, USE_TSLOADER} = process.env;

debug("Creating configuration.");
const webpackConfig = {
	name: "client",
	target: "web",
	devtool: config.compiler_devtool,
	resolve: {
		modules: [
			"node_modules",
			paths.client()
		],
		extensions: [".js", ".jsx", ".json"].concat(USE_TSLOADER ? [".ts", ".tsx"] : []),
		alias: {
			//"react": __dirname + "/node_modules/react/",
			"react": paths.base() + "/node_modules/react/",
			"react-dom": paths.base() + "/node_modules/react-dom/",
			//"@types/react": paths.base() + "/node_modules/@types/react/",
		}
	},
	// same issue, for loaders like babel
	resolveLoader: {
		//fallback: [path.join(__dirname, "node_modules")]
		//modules: ["node_modules"],
	},
	module: {}
};

/*if (__PROD__) {
	webpackConfig.module.preLoaders = [
		{test: /\.jsx?$/, loader: "source-map-loader", exclude: /react-hot-loader/}
	];
}*/

// Entry Points
// ==========

const APP_ENTRY = paths.client(USE_TSLOADER ? "Main.ts" : "Main.js");

webpackConfig.entry = {
	app: __DEV__
		? [APP_ENTRY].concat(`webpack-hot-middleware/client?path=${config.compiler_public_path}__webpack_hmr`)
		: [APP_ENTRY],
	//vendor: config.compiler_vendors
};

// Bundle Output
// ==========

webpackConfig.output = {
	//filename: `[name].[${config.compiler_hash_type}].js`,
	filename: `[name].js?[${config.compiler_hash_type}]`, // have js/css files have static names, so google can still display content (even when js file has changed)
	path: paths.dist(),
	//path: path.resolve(__dirname, "dist"),
	publicPath: config.compiler_public_path,
	pathinfo: true, // include comments next to require-funcs saying path // (this seems to break webpack-runtime-require)
}

// Plugins
// ==========

//let ExposeRequirePlugin = require("webpack-expose-require-plugin");\
//var HappyPack = require('happypack');

webpackConfig.plugins = [
	// Plugin to show any webpack warnings and prevent tests from running
	function() {
		let errors = []
		this.plugin("done", function (stats) {
			if (stats.compilation.errors.length) {
				// Log each of the warnings
				stats.compilation.errors.forEach(function (error) {
					errors.push(error.message || error)
				})

				// Pretend no assets were generated. This prevents the tests from running, making it clear that there were warnings.
				//throw new Error(errors)
			}
		})
	},
	new webpack.DefinePlugin(config.globals),
	new HtmlWebpackPlugin({
		//template: paths.client("index.html"),
		//template: paths.base("Source/index.html"),
		template: "./Source/index.html",
		hash: false,
		// favicon: paths.client("Resources/favicon.ico"), // for including single favicon
		filename: "index.html",
		inject: "body",
		minify: {
			collapseWhitespace: true
		}
	}),
	/*new ExposeRequirePlugin({
		level: "dependency", // "all", "dependency", "application" 
		pathPrefix: "Source", // in case if your source is not placed in root folder. 
	}),*/

	/*new HappyPack({
		// loaders is the only required parameter:
		//loaders: [ 'babel?presets[]=es2015' ],
		loaders: ["babel"],
	}),*/

	new webpack.DllReferencePlugin({
		context: path.join(__dirname, "Source"),
		//context: paths.base(),
		manifest: require("../config/dll/vendor-manifest.json")
	}),

	/*new BundleAnalyzerPlugin({
		// Can be `server`, `static` or `disabled`.
		// In `server` mode analyzer will start HTTP server to show bundle report.
		// In `static` mode single HTML file with bundle report will be generated.
		// In `disabled` mode you can use this plugin to just generate Webpack Stats JSON file by setting `generateStatsFile` to `true`.
		analyzerMode: 'server',
		// Host that will be used in `server` mode to start HTTP server.
		analyzerHost: '127.0.0.1',
		// Port that will be used in `server` mode to start HTTP server.
		analyzerPort: 5015,
		// Path to bundle report file that will be generated in `static` mode.
		// Relative to bundles output directory.
		reportFilename: 'report.html',
		// Automatically open report in default browser
		//openAnalyzer: true,
		openAnalyzer: false,
		// If `true`, Webpack Stats JSON file will be generated in bundles output directory
		//generateStatsFile: true,
		// Name of Webpack Stats JSON file that will be generated if `generateStatsFile` is `true`.
		// Relative to bundles output directory.
		statsFilename: 'stats.json',
		// Options for `stats.toJson()` method.
		// For example you can exclude sources of your modules from stats file with `source: false` option.
		// See more options here: https://github.com/webpack/webpack/blob/webpack-1/lib/Stats.js#L21
		statsOptions: null,
		// Log level. Can be 'info', 'warn', 'error' or 'silent'.
		logLevel: 'info'
	})*/
]

if (__DEV__) {
	debug("Enable plugins for live development (HMR, NoErrors).")
	webpackConfig.plugins.push(
		new webpack.HotModuleReplacementPlugin(),
		new webpack.NoEmitOnErrorsPlugin()
	);
} else if (__PROD__ && !QUICK_DEPLOY) {
	debug("Enable plugins for production (OccurenceOrder, Dedupe & UglifyJS).")
	webpackConfig.plugins.push(
		//new webpack.optimize.OccurrenceOrderPlugin(),
		//new webpack.optimize.DedupePlugin(),
		new webpack.optimize.UglifyJsPlugin({
			compress: {
				unused: true,
				dead_code: true,
				warnings: false,
				keep_fnames: true,
			},
			mangle: {
				keep_fnames: true,
			},
			sourceMap: true,
		})
	)
}

// Don't split bundles during testing, since we only want import one bundle
if (!__TEST__) {
	webpackConfig.plugins.push(
		// maybe temp; the only reason we keep this for now, is because it makes the webpackJsonp function available (used in webpack-runtime-require)
		new webpack.optimize.CommonsChunkPlugin({
			names: ["vendor"]
		})
	)
}

// Loaders
// ==========

// JavaScript / JSON
webpackConfig.module.rules = [
	{
		test: USE_TSLOADER ? /\.(jsx?|tsx?)$/ : /\.jsx?$/,
		//exclude: [/node_modules/, /react-redux-firebase/],
		include: [paths.client()],
		loader: "babel-loader",
		//loader: "happypack/loader",
		query: config.compiler_babel
	},
	{
		test: /\.json$/,
		loader: "json-loader"
	},
];
if (USE_TSLOADER) {
	//webpackConfig.module.rules.push({test: /\.tsx?$/, loader: "awesome-typescript-loader"});
	webpackConfig.module.rules.push({test: /\.tsx?$/, loader: "ts-loader", query: {include: [paths.client()]}});
}

// Style Loaders
// ==========

// We use cssnano with the postcss loader, so we tell css-loader not to duplicate minimization.
const BASE_CSS_LOADER = "css-loader?sourceMap&-minimize"

// Add any packge names here whose styles need to be treated as CSS modules.
// These paths will be combined into a single regex.
/*const PATHS_TO_TREAT_AS_CSS_MODULES = [
	// "react-toolbox", (example)
]

// If config has CSS modules enabled, treat this project"s styles as CSS modules.
if (config.compiler_css_modules) {
	PATHS_TO_TREAT_AS_CSS_MODULES.push(
		paths.client().replace(/[\^\$\.\*\+\-\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g, "\\$&") // eslint-disable-line
	)
}
const isUsingCSSModules = !!PATHS_TO_TREAT_AS_CSS_MODULES.length
const cssModulesRegex = new RegExp(`(${PATHS_TO_TREAT_AS_CSS_MODULES.join("|")})`)

// Loaders for styles that need to be treated as CSS modules.
if (isUsingCSSModules) {
	const cssModulesLoader = [
		BASE_CSS_LOADER,
		"modules",
		"importLoaders=1",
		"localIdentName=[name]__[local]___[hash:base64:5]"
	].join("&")

	webpackConfig.module.rules.push({
		test: /\.scss$/,
		include: cssModulesRegex,
		loaders: [
			"style-loader",
			cssModulesLoader,
			"postcss-loader",
			"sass-loader?sourceMap"
		]
	})

	webpackConfig.module.rules.push({
		test: /\.css$/,
		include: cssModulesRegex,
		loaders: [
			"style-loader",
			cssModulesLoader,
			"postcss-loader"
		]
	})
}*/

// Loaders for files that should not be treated as CSS modules.
//const excludeCSSModules = isUsingCSSModules ? cssModulesRegex : false
webpackConfig.module.rules.push({
	test: /\.scss$/,
	//exclude: excludeCSSModules,
	loader: ExtractTextPlugin.extract({
		fallback: "style-loader",
		loader: [
			BASE_CSS_LOADER,
			{
				loader: "postcss-loader",
				options: cssnano({
					autoprefixer: {
						add: true,
						remove: true,
						browsers: ["last 2 versions"]
					},
					discardComments: {
						removeAll: true
					},
					discardUnused: false,
					mergeIdents: false,
					reduceIdents: false,
					safe: true,
					sourcemap: true
				})
			},
			{
				loader: "sass-loader?sourceMap",
				options: {
					includePaths: paths.client("styles")
				}
			}
		],
	}),
});
webpackConfig.module.rules.push({
	test: /\.css$/,
	//exclude: excludeCSSModules,
	loader: ExtractTextPlugin.extract({
		fallback: "style-loader",
		loader: [BASE_CSS_LOADER, "postcss-loader"],
	}),
});

/*webpackConfig.sassLoader = {
	includePaths: paths.client("styles")
}*/

/*webpackConfig.postcss = [
	cssnano({
		autoprefixer: {
			add: true,
			remove: true,
			browsers: ["last 2 versions"]
		},
		discardComments: {
			removeAll: true
		},
		discardUnused: false,
		mergeIdents: false,
		reduceIdents: false,
		safe: true,
		sourcemap: true
	})
]*/

// File loaders
/* eslint-disable */
webpackConfig.module.rules.push(
	{ test: /\.woff(\?.*)?$/, loader: "url-loader?prefix=fonts/&name=[path][name].[ext]&limit=10000&mimetype=application/font-woff" },
	{ test: /\.woff2(\?.*)?$/, loader: "url-loader?prefix=fonts/&name=[path][name].[ext]&limit=10000&mimetype=application/font-woff2" },
	{ test: /\.otf(\?.*)?$/, loader: "file-loader?prefix=fonts/&name=[path][name].[ext]&limit=10000&mimetype=font/opentype" },
	{ test: /\.ttf(\?.*)?$/, loader: "url-loader?prefix=fonts/&name=[path][name].[ext]&limit=10000&mimetype=application/octet-stream" },
	{ test: /\.eot(\?.*)?$/, loader: "file-loader?prefix=fonts/&name=[path][name].[ext]" },
	{ test: /\.svg(\?.*)?$/, loader: "url-loader?prefix=fonts/&name=[path][name].[ext]&limit=10000&mimetype=image/svg+xml" },
	{ test: /\.(png|jpg)$/, loader: "url-loader?limit=8192" }
)
/* eslint-enable */

// Finalize Configuration
// ==========

// when we don't know the public path (we know it only when HMR is enabled [in development]) we
// need to use the extractTextPlugin to fix this issue:
// http://stackoverflow.com/questions/34133808/webpack-ots-parsing-error-loading-fonts/34133809#34133809
//if (!__DEV__ && !__TEST__) {
/*debug("Apply ExtractTextPlugin to CSS loaders.");
webpackConfig.module.rules.filter(loader=>
	loader.loaders && loader.loaders.find(name=>/css/.test(name.split("?")[0]))
).forEach(loader=> {
	const first = loader.loaders[0];
	const rest = loader.loaders.slice(1);
	loader.loader = ExtractTextPlugin.extract({fallback: first, use: rest.join("!")});
	delete loader.loaders;
});*/

webpackConfig.plugins.push(
	//new ExtractTextPlugin("[name].[contenthash].css", {allChunks: true}),
	new ExtractTextPlugin({filename: "[name].css?[contenthash]", allChunks: true})
);
//}

module.exports = webpackConfig;