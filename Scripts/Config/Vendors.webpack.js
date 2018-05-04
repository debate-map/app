const StringReplacePlugin = require("string-replace-webpack-plugin");
var path = require("path");
var webpack = require("webpack");
const config = require("../Config");

let QUICK = process.env.QUICK;

let root = path.join(__dirname, "..", "..");

module.exports = {
	//name: "vendor_package",
	mode: "none",
	//mode: "development",
	//mode: "production", // needed so that main bundle knows to reference vendor-bundle modules using id instead of path
	//optimization: {namedModules: false},
	optimization: {
		namedModules: true,
		noEmitOnErrors: true, // NoEmitOnErrorsPlugin
		//concatenateModules: true //ModuleConcatenationPlugin
		/*splitChunks: { // CommonsChunkPlugin()
			name: 'vendor',
			minChunks: 2
		},*/
	},
	entry: {
		vendor: [path.join(__dirname, "Vendors.js")]
	},
	output: {
		//path: path.join(root, "dist", "dll"),
		//path: path.join(root, "dist"),
		path: path.join(root, "Scripts", "Config", "dll"),
		//filename: "dll.[name].js?[chunkhash]",
		//filename: "dll.[name].js?[hash]",
		filename: "dll.[name].js",
		library: "[name]"
	},
	//devtool: "cheap-module-source-map",
	devtool: "source-map",
	plugins: [
		new webpack.DllPlugin({
			path: path.join(__dirname, "dll", "[name]-manifest.json"),
			name: "[name]",
			context: path.resolve(root, "Source"),
			//context: root,
		}),
		//new webpack.optimize.OccurenceOrderPlugin(),
		//new webpack.optimize.DedupePlugin(),
		new webpack.DefinePlugin(config.globals),
		QUICK ? ()=>{} : new webpack.optimize.UglifyJsPlugin({
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
		}),
		new StringReplacePlugin(),
	],
	resolve: {
		modules: [
			path.resolve(root, "Source"),
			"node_modules",
		],
	},
	module: {
		rules: [
			{
				test: /\.json$/,
				loader: "json-loader",
				include: [
					"./node_modules/entities/maps",
				],
			},

			// module text-replacements (a better alternative than directly modifying files in node_modules, as that conflicts with npm's installations/control)
			// ==========

			{
				test: /ReactDebugTool.js/,
				loader: StringReplacePlugin.replace({replacements: [
					{
						// expose ReactDebugTool.getTreeSnapshot
						pattern: /module.exports = /g,
						replacement: (match, offset, string)=> {
							return Clip(`
ReactDebugTool.getTreeSnapshot = getTreeSnapshot;

module.exports = 
							`);
						}
					},
				]})
			},
			{
				test: /connectAdvanced.js/,
				loader: StringReplacePlugin.replace({replacements: [
					// remove try-catch blocks
					{pattern: /try {/g, replacement: ()=>`//try {`},
					{
						pattern: /} catch(.+?){/g,
						replacement: (match, p1)=>
							`//} catch${p1}{
							if (0) {`
					},
				]})
			}
		]
	}
};

function Clip(str) {
	let lines = str.split("\n");
	lines.splice(0, 1); // remove first line
	lines.splice(-1, 1); // remove last line
	return lines.join("\n");
}