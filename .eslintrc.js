let path = require("path");
module.exports = {
	extends: [
		"vbase",
	],
	settings: {
		//"import/extensions": [".js", ".jsx", ".ts", ".tsx"],
		"import/resolver": {
			/*"webpack": {
				"config": "./Scripts/Build/WebpackConfig.js",
			},*/
			"node": {
				"paths": [
					//"Source",
					//path.resolve("Source"),
					path.resolve(),
				],
				"extensions": [
				  ".js",
				  ".jsx",
				  ".ts",
				  ".tsx",
				]
			}
		}
	},
	rules: {},
	globals: {},
};