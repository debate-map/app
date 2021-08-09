// this list is used for both .dockerignore (through UpdateDockerIgnore.js) and ecosystem.config.cjs
const nmWatchPaths = [
	"node_modules/web-vcore/Dist",
	//"node_modules/web-vcore/Dist/**",
	"node_modules/web-vcore/nm",
	//"node_modules/web-vcore/nm/**",
	//"node_modules/web-vcore/nm/js-vextensions.js",
	"node_modules/@pg-lq/postgraphile-plugin/Build",
];

// based on: require("web-vcore/YVTConfig.cjs").venryx_standardSymlinkedPackages
const nmWatchPaths_possiblyUnderWebVCore = [
	"node_modules/graphql-feedback/Dist",
	"node_modules/js-vextensions/Dist",
	"node_modules/js-vextensions/Helpers",
	"node_modules/react-vextensions/Dist",
	"node_modules/react-vcomponents/Dist",
	"node_modules/react-vmenu/Dist",
	"node_modules/react-vmessagebox/Dist",
	"node_modules/mobx-graphlink/Dist",
	"node_modules/eslint-config-vbase",
];
for (const path of nmWatchPaths_possiblyUnderWebVCore) {
	nmWatchPaths.push(path);
	nmWatchPaths.push(`node_modules/web-vcore/${path}`);
}

exports.default = nmWatchPaths;