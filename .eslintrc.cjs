const paths = require("path");
const {FindWVCNodeModule} = require("web-vcore/Scripts/@CJS/ModuleFinder");

module.exports = {
	extends: [
		FindWVCNodeModule("eslint-config-vbase/index.js"),
	],
	rules: {
		// block any imports from the ".yalc" folder (all such imports should instead be from the "node_modules" folder)
		"no-restricted-imports": ["error", {
			patterns: [{
				group: ["**/.yalc/**"],
			}],
		}],
		// for any code under "./Packages/js-common", block any imports from the "web-vcore" folder
		"import/no-restricted-paths": [
			"error",
			{
				basePath: __dirname,
				zones: [
					//{target: paths.join(__dirname, "Packages/js-common"), from: "web-vcore"},
					//{target: "./Packages/js-common", from: "web-vcore"},
					{target: "./Packages/js-common", from: "./node_modules/web-vcore/", except: ["./nm"]},
				],
			},
		],
		//"no-tabs": "error",
	},
	globals: {},
};