// at dev-time, we import from "web-vcore/nm/XXX", so no need for vlibs as direct deps;
// 	and at docker-build time, we also don't need the symlinks, since we want to use the strict npm-versions of all packages anyway
process.env.VLIBS_USE_SYMLINKS = "off";

//const wvcPackageJSONObj = require("web-vcore/package.json");
const yvtConfigObj = require("web-vcore/YVTConfig.cjs").config;

console.log("Collected yvt-config from web-vcore:", yvtConfigObj);

exports.config = {
	//dependencyOverrideGroups: wvcPackageJSONObj.dependencyOverrideGroups,
	dependencyOverrideGroups: yvtConfigObj.dependencyOverrideGroups,
};