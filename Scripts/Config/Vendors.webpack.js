var path = require("path");
var webpack = require("webpack");
const config = require("../config");

let QUICK = process.env.QUICK;

let root = path.join(__dirname, "..", "..");

module.exports = {
	entry: {
		vendor: [path.join(__dirname, "Vendors.js")]
	},
	output: {
		path: path.join(root, "dist", "dll"),
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
			context: path.resolve(root, "Source")
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
		})
	],
	resolve: {
		modules: [
			path.resolve(root, "Source"),
			"node_modules",
		],
	},
	module: {
		loaders: [
			{
				test: /\.json$/,
				loader: "json-loader"
			},
		]
	}
};