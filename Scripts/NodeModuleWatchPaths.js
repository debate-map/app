// this list is used for both .dockerignore (through UpdateDockerIgnore.js) and ecosystem.config.cjs
exports.nmWatchPaths_notUnderWVC_base = [
	"node_modules/web-vcore/Dist",
	//"node_modules/web-vcore/Dist/**",
	"node_modules/web-vcore/nm",
	//"node_modules/web-vcore/nm/**",
	//"node_modules/web-vcore/nm/js-vextensions.js",
	"node_modules/web-vcore/Scripts",
	"node_modules/web-vcore/Scripts_Dist",
	"node_modules/@pg-lq/postgraphile-plugin/Build",
];

// based on: require("web-vcore/YVTConfig.cjs").venryx_standardSymlinkedPackages
exports.nmWatchPaths_notUnderWebVCore_butCouldBe = [
	"node_modules/graphql-feedback/Dist",
	"node_modules/js-vextensions/Dist",
	"node_modules/js-vextensions/Helpers",
	"node_modules/react-vextensions/Dist",
	"node_modules/react-vcomponents/Dist",
	"node_modules/react-vmenu/Dist",
	"node_modules/react-vmessagebox/Dist",
	"node_modules/mobx-graphlink/Dist",
	//"node_modules/eslint-config-vbase",
	"node_modules/eslint-config-vbase/index.js",
];
exports.nmWatchPaths_notUnderWVC = [...exports.nmWatchPaths_notUnderWVC_base, ...exports.nmWatchPaths_notUnderWebVCore_butCouldBe];

exports.nmWatchPaths_underWVC = [];
exports.nmWatchPaths = [...exports.nmWatchPaths_notUnderWVC];
for (const path of exports.nmWatchPaths_notUnderWebVCore_butCouldBe) {
	exports.nmWatchPaths.push(path);
	exports.nmWatchPaths.push(`node_modules/web-vcore/${path}`);
	exports.nmWatchPaths_underWVC.push(`node_modules/web-vcore/${path}`);
}
exports.default = exports.nmWatchPaths;