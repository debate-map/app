const {FindWVCNodeModule} = require("web-vcore/Scripts/@CJS/ModuleFinder");

module.exports = {
	extends: [
		FindWVCNodeModule("eslint-config-vbase/index.js"),
	],
	settings: {},
	rules: {},
	globals: {},
};