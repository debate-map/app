const webpack = require("webpack");
const cssnano = require("cssnano");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const config = require("../config");
const debug = require("debug")("app:webpack:config");
const path = require("path");
const fs = require("fs");

const paths = config.utils_paths;
const {__DEV__, __PROD__, __TEST__} = config.globals;
const {QUICK, USE_TSLOADER, OUTPUT_STATS} = process.env;

let root = path.join(__dirname, "..", "..");

debug("Creating configuration.");
const webpackConfig = {
	name: "client",
	mode: "development",
	//mode: "production",
	optimization: {namedModules: false},
	//optimization: {namedModules: true}, // we have path-info anyway (and causes problems when inconsistent between bundles)
	target: "web",
	devtool: config.compiler_devtool,
	resolve: {
		modules: [
			"node_modules",
			paths.client(),
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
	module: {
		/*noParse: [
			/JQuery3.1.0.js$/
		]*/
	}
};

/*if (__PROD__) {
	webpackConfig.module.preLoaders = [
		{test: /\.jsx?$/, use: "source-map-loader", exclude: /react-hot-loader/}
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
	//filename: `[name].js?[chunkhash]`, // have js/css files have static names, so google can still display content (even when js file has changed)
	filename: `[name].js?[hash]`, // have js/css files have static names, so google can still display content (even when js file has changed)
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
		//hash: true,
		// favicon: paths.client("Resources/favicon.ico"), // for including single favicon
		filename: "index.html",
		inject: "body",
		minify: {
			collapseWhitespace: true
		}
	}),
	function() {
		this.plugin("compilation", function(compilation) {
			compilation.plugin("html-webpack-plugin-after-html-processing", function(htmlPluginData) {
				// this couldn't find the "manifest.json" asset
				/*var chunk0_filename = compilation.assets["manifest.json"][0];
				var hash = chunk0_filename.match(/?(.+)$/)[1];*/

				// this worked, except it used the "app.js"-specific content-hash, rather than the build's hash which we want
				//var hash = compilation.chunks[0].hash;

				// this gets the build's hash like we want
				var hash = htmlPluginData.html.match(/\.js\?([0-9a-f]+)["']/)[1];
				htmlPluginData.html = htmlPluginData.html.replace("/dll.vendor.js?[hash]", "/dll.vendor.js?" + hash);
				//callback(null, htmlPluginData);
				return htmlPluginData;
			});
		});
	},
	/*new ExposeRequirePlugin({
		level: "dependency", // "all", "dependency", "application" 
		pathPrefix: "Source", // in case if your source is not placed in root folder. 
	}),*/

	/*new HappyPack({
		// loaders is the only required parameter:
		//loaders: [ 'babel?presets[]=es2015' ],
		loaders: ["babel"],
	}),*/

	/*new webpack.DllReferencePlugin({
		context: path.join(root, "Source"),
		//context: paths.base(),
		//context: root,
		//manifest: require("../Config/dll/vendor-manifest.json")
		manifest: "Scripts/Config/dll/vendor-manifest.json",
	}),*/

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
		//new webpack.NamedModulesPlugin()
	);
} else if (__PROD__ && !QUICK) {
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

// Don't split bundles during testing, since we only want to import one bundle
if (!__TEST__) {
	/*webpackConfig.plugins.push(
		// maybe temp; the only reason we keep this for now, is because it makes the webpackJsonp function available (used in webpack-runtime-require)
		new webpack.optimize.CommonsChunkPlugin({
			names: ["vendor"]
		})
	)*/
	//config.optimization.splitChunks = true;
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
		//use: "happypack/loader",
		options: config.compiler_babel
	},
	{
		test: /\.json$/,
		loader: "json-loader",
		include: [
			"./node_modules/ajv/lib/refs",
		]
	},
];
if (USE_TSLOADER) {
	//webpackConfig.module.rules.push({test: /\.tsx?$/, use: "awesome-typescript-loader"});
	webpackConfig.module.rules.push({test: /\.tsx?$/, loader: "ts-loader", options: {include: [paths.client()]}});
}

// css loaders
// ==========

// We use cssnano with the postcss loader, so we tell css-loader not to duplicate minimization.
//const BASE_CSS_LOADER = "css-loader?sourceMap&-minimize"
const BASE_CSS_LOADER = "css-loader?-minimize";

webpackConfig.module.rules.push({
	test: /\.scss$/,
	use: ExtractTextPlugin.extract({
		fallback: "style-loader",
		use: [
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
					//sourcemap: true
				})
			},
			{
				//loader: "sass-loader?sourceMap",
				loader: "sass-loader",
				options: {
					includePaths: [paths.client("styles")],
				}
			}
			/*{
				loader: "fast-sass-loader",
				options: {
					includePaths: [paths.client("styles")],
				}
			}*/
		],
		allChunks: true, // makes it slightly faster, I think?
	}),
});
webpackConfig.module.rules.push({
	test: /\.css$/,
	//exclude: excludeCSSModules,
	use: ExtractTextPlugin.extract({
		fallback: "style-loader",
		use: [BASE_CSS_LOADER, "postcss-loader"],
		allChunks: true, // makes it slightly faster, I think?
	}),
});

// File loaders
/* eslint-disable */
webpackConfig.module.rules.push(
	{test: /\.woff(\?.*)?$/, use: "url-loader?prefix=fonts/&name=[path][name].[ext]&limit=10000&mimetype=application/font-woff"},
	{test: /\.woff2(\?.*)?$/, use: "url-loader?prefix=fonts/&name=[path][name].[ext]&limit=10000&mimetype=application/font-woff2"},
	{test: /\.otf(\?.*)?$/, use: "file-loader?prefix=fonts/&name=[path][name].[ext]&limit=10000&mimetype=font/opentype"},
	{test: /\.ttf(\?.*)?$/, use: "url-loader?prefix=fonts/&name=[path][name].[ext]&limit=10000&mimetype=application/octet-stream"},
	{test: /\.eot(\?.*)?$/, use: "file-loader?prefix=fonts/&name=[path][name].[ext]"},
	//{test: /\.svg(\?.*)?$/, use: "url-loader?prefix=fonts/&name=[path][name].[ext]&limit=10000&mimetype=image/svg+xml"},
	{test: /\.(png|jpg)$/, use: "url-loader?limit=8192"}
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
	//new ExtractTextPlugin({filename: "[name].css?[contenthash]", allChunks: true})
	new ExtractTextPlugin({filename: "[name].css?[md5:contenthash:hex:20]", allChunks: true}) // replace with mini-css-extract-plugin once it supports HMR
	//new ExtractTextPlugin({filename: "[name].css", allChunks: true})
);

const SpriteLoaderPlugin = require("svg-sprite-loader/plugin");
webpackConfig.plugins.push(
	new SpriteLoaderPlugin()
);
webpackConfig.module.rules.push({
	test: /\.svg$/,
	loader: "svg-sprite-loader",
	/*include: path.resolve("./Resources/SVGs"),
	options: {
		extract: true,
		spriteFilename: "svg-sprite.svg",
	}*/
	/*use: [
		"svg-sprite-loader",
		"svgo-loader",
	]*/
});

if (OUTPUT_STATS) {
	let firstOutput = true;
	webpackConfig.plugins.push(
		{
			apply: function(compiler) {
				compiler.plugin("after-emit", function(compilation, done) {
					var stats = compilation.getStats().toJson({
						hash: false,
						version: false,
						timings: true,
						assets: false,
						chunks: false,
						chunkModules: false,
						chunkOrigins: false,
						modules: true,
						cached: false,
						reasons: true,
						children: false,
						source: false,
						errors: false,
						errorDetails: false,
						warnings: false,
						publicPath: false,
					});
					fs.writeFile(`./Tools/Webpack Profiling/Stats${firstOutput ? "" : "_Incremental"}.json`, JSON.stringify(stats));

					let modules_justTimings = stats.modules.map(mod=> {
						let timings = mod.profile;
						return {
							name: mod.name,
							totalTime: (timings.factory|0) + (timings.building|0) + (timings.dependencies|0),
							timings: timings,
						};
					});
					modules_justTimings = SortArrayDescending(modules_justTimings, a=>a.totalTime);

					let modules_justTimings_asMap = {};
					for (let mod of modules_justTimings) {
						modules_justTimings_asMap[mod.name] = mod;
						delete mod.name;
					}
					fs.writeFile(`./Tools/Webpack Profiling/ModuleTimings${firstOutput ? "" : "_Incremental"}.json`, JSON.stringify(modules_justTimings_asMap, null, 2));

					firstOutput = false;

					done();
				});

				// uncomment this to output the module-info that can be used later to see cyclic-dependencies, using AnalyzeDependencies.bat
				/*compiler.plugin("done", function(stats) {
					let moduleInfos = {};
					for (let module of stats.compilation.modules) {
						//if (!module.resource) continue;
						//if (module.dependencies == null) continue;
						let moduleInfo = {};
						//moduleInfo.name = module.name;
						if (module.resource) {
							moduleInfo.name = path.relative(process.cwd(), module.resource).replace(/\\/g, "/");
						}
						if (module.dependencies) {
							moduleInfo.dependencies = module.dependencies.filter(a=>a.module).map(a=>a.module.id);
						}
						moduleInfos[module.id] = moduleInfo;
					}
					fs.writeFile(`./Tools/Webpack Profiling/ModuleInfo.json`, JSON.stringify(moduleInfos));
				});*/
			}
		}
	);

	/*let CircularDependencyPlugin = require("circular-dependency-plugin");
	webpackConfig.plugins.push(
		new CircularDependencyPlugin({exclude: /node_modules/})
	);*/

	let CyclicDependencyChecker = require("webpack-dependency-tools").CyclicDependencyChecker;
	webpackConfig.plugins.push(
		new CyclicDependencyChecker()
	);

	webpackConfig.profile = true;
	webpackConfig.stats = "verbose";
}

function SortArray(array, valFunc = (item, index)=>item) {
    return StableSort(array, (a, b, aIndex, bIndex)=>Compare(valFunc(a, aIndex), valFunc(b, bIndex)));
};
function SortArrayDescending(array, valFunc = (item, index)=>item) {
	return SortArray(array, (item, index)=>-valFunc(item, index));
};
function StableSort(array, compareFunc) { // needed for Chrome
	var array2 = array.map((item, index)=>({index, item}));
	array2.sort((a, b)=> {
		var r = compareFunc(a.item, b.item, a.index, b.index);
		return r != 0 ? r : Compare(a.index, b.index);
	});
	return array2.map(pack=>pack.item);
}
function Compare(a, b, caseSensitive = true) {
	if (!caseSensitive && typeof a == "string" && typeof b == "string") {
		a = a.toLowerCase();
		b = b.toLowerCase();
	}
	return a < b ? -1 : (a > b ? 1 : 0);
}

module.exports = webpackConfig;