// at dev-time, we import from "web-vcore/nm/XXX", so no need for vlibs as direct deps;
// 	and at docker-build time, we also don't need the symlinks, since we want to use the strict npm-versions of all packages anyway
/*process.env.VLIBS_USE_SYMLINKS = "off";
const yvtConfigObj = require("web-vcore/YVTConfig.cjs").config;
console.log("Collected yvt-config from web-vcore:", yvtConfigObj);*/

//const inDocker = process.env.USERNAME == null;
const inDocker = require("fs").existsSync("/.dockerenv");

exports.config = {
	//dependencyOverrideGroups: wvcPackageJSONObj.dependencyOverrideGroups,
	//dependencyOverrideGroups: yvtConfigObj.dependencyOverrideGroups,
	dependencyOverrideGroups: [
		!inDocker && process.env.VLIBS_USER == "venryx" && {
			overrides_forSelf: {
				//"web-vcore": "portal:./Portals/web-vcore",
				//"@pg-lq/postgraphile-plugin": "portal:./Portals/@pg-lq_postgraphile-plugin",
				"web-vcore": "link:../../@Modules/web-vcore/Main",
				"@pg-lq/postgraphile-plugin": "link:../../@Modules/postgraphile-live-query/Main/Packages/postgraphile-plugin",
			}
		}
	],
};