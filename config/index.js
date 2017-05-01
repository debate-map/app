/* eslint key-spacing:0 spaced-comment:0 */
const path = require("path")
const debug = require("debug")("app:config")
const argv = require("yargs").argv
const ip = require("ip")
const environments = require("./environments");

const {NODE_ENV, PORT, USE_TSLOADER, BASENAME} = process.env;

debug("Creating default configuration.")

// Default Configuration
// ==========

const config = {
	env: NODE_ENV || "development",

	// Project Structure
	// ----------
	path_base  : path.resolve(__dirname, ".."),
	dir_client : USE_TSLOADER ? "Source" : "Source_JS",
	dir_dist   : "dist",
	dir_server : "Server",
	dir_test   : "Tests",

	// Server Configuration
	// ----------
	server_host: ip.address(), // use string "localhost" to prevent exposure on local network
	server_port: PORT || 3000,

	// Compiler Configuration
	// ----------
	// remember that if you change the compiler settings, you'll need to clear the happypack cache
	compiler_babel: {
		cacheDirectory: true,
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
			"babel-plugin-transform-es2015-function-name",
			"babel-plugin-transform-es2015-literals",
			["babel-plugin-transform-es2015-modules-commonjs", {strict: true, noInterop: true}],
			"babel-plugin-transform-es2015-object-super",
			"babel-plugin-transform-es2015-parameters",
			"babel-plugin-transform-es2015-shorthand-properties",
			"babel-plugin-transform-es2015-spread",
			"babel-plugin-transform-es2015-sticky-regex",
			"babel-plugin-transform-es2015-template-literals",
			"babel-plugin-transform-es2015-typeof-symbol",
			"babel-plugin-transform-es2015-unicode-regex",
			//"babel-plugin-transform-regenerator",

			// from stage-0
			"babel-plugin-transform-object-rest-spread",
			"babel-plugin-transform-class-properties",

			//"babel-plugin-transform-runtime",
			["babel-plugin-transform-runtime", {"regenerator": false}],
			"babel-plugin-lodash",
			"babel-plugin-transform-decorators-legacy"
		],
	},
	//compiler_devtool: "source-map", // shows: original (in error.stack, shows bundle line)
	compiler_devtool: "cheap-module-eval-source-map", // shows: original (in error.stack, shows eval/transpiled-to-js-but-in-module line)
	//compiler_devtool: "cheap-module-source-map", // in webpack-2 at least, shows: transpiled-to-js
	//compiler_devtool: "cheap-source-map", // shows: transpiled-to-js
	//compiler_devtool: "eval", // shows: transpiled-to-js
	compiler_hash_type: "hash",
	compiler_fail_on_warning: false,
	compiler_quiet: false,
	compiler_public_path: "/",
	compiler_stats: {
		chunks : false,
		chunkModules : false,
		colors : true
	},
	/*compiler_vendors: [
		"react",
		"react-router",
		"react-redux",
		"redux",
		"react-google-button",
		"react-modal",
		"moment",
		"radium",
		"react-autobind",
		"react-markdown",
		"react-router-dom",
		"react-router-redux",
		"react-redux-firebase",
		"redux-persist",
		"redux-persist-transform-filter",
		"reselect",
		"react-vmenu",
	],*/

	//compiler_css_modules: true, // enable/disable css modules

 	// Test Configuration
	// ----------
	coverage_reporters: [
		{type : "text-summary"},
		{type : "lcov", dir : "coverage"}
	]
};

// All Internal Configuration Below
// Edit at Your Own Risk
// ==========
// ==========

// Environment
// ==========

// N.B.: globals added here must _also_ be added to .eslintrc
config.globals = {
	"process.env": {
		"NODE_ENV": JSON.stringify(config.env)
	},
	"NODE_ENV": config.env,
	"__DEV__": config.env == "development",
	"__PROD__": config.env == "production",
	"__TEST__": config.env == "test",
	"__COVERAGE__": !argv.watch && config.env === "test",
	"__BASENAME__": JSON.stringify(BASENAME || "")
}

// Validate Vendor Dependencies
// ==========

const pkg = require("../package.json");

/*config.compiler_vendors = config.compiler_vendors
	.filter(dep=> {
		if (pkg.dependencies[dep]) return true

		debug(`Package "${dep}" was not found as an npm dependency in package.json; it won't be included in the webpack vendor bundle.`
			+ ` Consider removing it from \`compiler_vendors\` in ~/config/index.js`)
	})*/

// Utilities
// ==========

function base() {
	const args = [config.path_base].concat([].slice.call(arguments));
	return path.resolve.apply(path, args);
}

config.utils_paths = {
	base   : base,
	client : base.bind(null, config.dir_client),
	dist   : base.bind(null, config.dir_dist)
};

// Environment Configuration
// ==========

debug(`Looking for environment overrides for NODE_ENV "${config.env}".`);
const overrides = environments[config.env];
if (overrides) {
	debug("Found overrides, applying to default configuration.");
	Object.assign(config, overrides(config));
} else {
	debug("No environment overrides found, defaults will be used.");
}

module.exports = config;