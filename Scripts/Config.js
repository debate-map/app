const path = require("path");
const debug = require("debug")("app:config");
const argv = require("yargs").argv;
const ip = require("ip");

const {NODE_ENV, PORT, USE_TSLOADER, BASENAME} = process.env;

// make these variables global throughout the compile-time scripts
global.ENV = NODE_ENV;
global.ENV_SHORT = {development: "dev", production: "prod"}[ENV] || ENV;
global.DEV = ENV == "development";
global.PROD = ENV == "production";
global.TEST = ENV == "test";

debug("Creating default configuration.");

const config = {};
Object.assign(config, {
	// project structure
	// ----------
	path_base: path.resolve(__dirname, ".."),
	dir_client: USE_TSLOADER ? "Source" : "Source_JS",
	dir_dist: "dist",
	dir_server: "Scripts/Server",
	dir_test: "Tests",

	// server configuration
	// ----------
	server_host: ip.address(), // use string "localhost" to prevent exposure on local network
	server_port: PORT || 3000,

	// compiler configuration
	// ----------
	// remember that if you change the compiler settings, you'll need to clear the happypack cache
	compiler_babel: {
		//cacheDirectory: true,
		presets: [
			//"babel-preset-es2015",
			"babel-preset-react",
			//"babel-preset-stage-0"
		],
		plugins: [
			// from es2015
			"babel-plugin-check-es2015-constants",
			"babel-plugin-transform-es2015-arrow-functions",
			"babel-plugin-transform-es2015-block-scoped-functions",
			"babel-plugin-transform-es2015-block-scoping",
			"babel-plugin-transform-es2015-classes",
			"babel-plugin-transform-es2015-computed-properties",
			"babel-plugin-transform-es2015-destructuring",
			"babel-plugin-transform-es2015-duplicate-keys",
			//"babel-plugin-transform-es2015-for-of", // ohhh, I hate this thing... (the try-catch wrapping within transpiled for-of's)
			PROD && ["babel-plugin-transform-es2015-for-of", {loose: true}], // loose removes the try-catch wrapping
			"babel-plugin-transform-es2015-function-name",
			"babel-plugin-transform-es2015-literals",
			"babel-plugin-transform-es2015-modules-commonjs", // uncommented; went back to using interop... (regenerator needs it -_-)
			//["babel-plugin-transform-es2015-modules-commonjs", {strict: true, noInterop: true}],
			"babel-plugin-transform-es2015-object-super",
			"babel-plugin-transform-es2015-parameters",
			"babel-plugin-transform-es2015-shorthand-properties",
			"babel-plugin-transform-es2015-spread",
			"babel-plugin-transform-es2015-sticky-regex",
			"babel-plugin-transform-es2015-template-literals",
			"babel-plugin-transform-es2015-typeof-symbol",
			"babel-plugin-transform-es2015-unicode-regex",
			PROD && "babel-plugin-transform-regenerator", // for "async" transpilation; had been disabled, but found still needed for googlebot

			// from stage-0
			"babel-plugin-transform-object-rest-spread",
			"babel-plugin-transform-class-properties",

			PROD && "babel-plugin-transform-runtime", // for "async" transpilation; had been disabled, but found still needed for googlebot
			//["babel-plugin-transform-runtime", {"regenerator": false}],
			"babel-plugin-lodash",
			"babel-plugin-transform-decorators-legacy"
		].filter(a=>a),
	},
	// list of types: https://webpack.js.org/configuration/devtool
	// *: All "eval" ones don't work anymore with new tsc setup -- they don't show original files
	//compiler_devtool: "source-map", // shows: original (in error.stack, shows bundle line) [6s/rebuild]
	//compiler_devtool: "cheap-module-eval-source-map", // *shows: original (in error.stack, shows eval/transpiled-to-js-but-in-module line)
	//compiler_devtool: "cheap-module-source-map", // shows: original [however, for some reason it misses lots of lines -- at least in async functions]
	compiler_devtool: "cheap-source-map", // shows: transpiled-to-js [.8s/rebuild]
	//compiler_devtool: "eval", // *shows: transpiled-to-js
	compiler_fail_on_warning: false,
	compiler_quiet: false,
	compiler_public_path: "/",
	compiler_stats: {
		chunks : false,
		chunkModules : false,
		colors : true
	},

	//compiler_css_modules: true, // enable/disable css modules

 	// Test Configuration
	// ----------
	coverage_reporters: [
		{type : "text-summary"},
		{type : "lcov", dir : "coverage"}
	]
});

// compile-time defines
// ==========

// we have to turn the values into strings, because that's the only type of input accepted by webpack.DefinePlugin
function S(obj) {
	return JSON.stringify(obj);
}

config.globals = {
	ENV_COMPILE_TIME: S(ENV), // this is always a compile-time define/insertion
};

if (PROD) {
	// If building for production, lock all the env-variables as compile-time defines. (meaning eg. `if (DEV)` blocks are compiled out)
	Object.assign(config.globals, {ENV_SHORT: S(ENV_SHORT), ENV: S(ENV), DEV: S(DEV), PROD: S(PROD), TEST: S(TEST)});
}

// DON'T EVER USE THESE; we only include them in case libraries use them (such as redux)
Object.assign(config.globals, {
	"process.env": {"NODE_ENV": S(ENV)}, "NODE_ENV": S(ENV),
	"__DEV__": S(DEV), "__PROD__": S(PROD), "__TEST__": S(TEST),
	"__COVERAGE__": !argv.watch ? S(TEST) : null,
	"__BASENAME__": S(BASENAME),
});

// path helpers
// ==========

config.utils_paths = {
	base: (...extra)=>path.resolve(config.path_base, ...extra),
	client: (...extra)=>path.resolve(config.path_base, config.dir_client, ...extra),
	dist: (...extra)=>path.resolve(config.path_base, config.dir_dist, ...extra),
};

// environment configuration
// ==========

config.compiler_public_path = "/";

if (PROD) {
	config.compiler_fail_on_warning = false;
	config.compiler_hash_type = "chunkhash";
	//config.compiler_devtool = null;
	//config.compiler_devtool = "cheap-module-source-map";
	config.compiler_devtool = "source-map";
	config.compiler_stats = {
		chunks: true,
		chunkModules: true,
		colors: true
	};
}

// disabled for now; I've found I like the control of being able to skip reloads during change sets
config.useHotReloading = false;

module.exports = config;