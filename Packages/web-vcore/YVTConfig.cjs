exports.config = {};

console.log("VLIBS_USER:", process.env.VLIBS_USER);

exports.venryx_standardSymlinkedPackages = [
	"eslint-config-vbase",
	"js-vextensions",
	"react-uplot",
	"react-vextensions",
	"react-vcomponents",
	"react-vmenu",
	"react-vmessagebox",
	"mobx-graphlink",
];
if (process.env.VLIBS_USER == "venryx") {
	//const fs = require("fs");

	//const vReposRoot = fs.existsSync("C:/Root/Apps/@V") ? `C:/Root/Apps/@V` : null;
	const thisDir = __dirname.replace(/\\/g, "/");
	const vReposRoot = thisDir.startsWith("C:/Root/Apps/@V") ? `C:/Root/Apps/@V` : null;
	const vReposRoot_stepsUpFromThisDir = thisDir.split("/").length - vReposRoot.split("/").length;
	const vReposRoot_stepUpStr = "../".repeat(vReposRoot_stepsUpFromThisDir);

	if (process.env.VLIBS_USE_SYMLINKS != "off") {
		//const {standardSymlinkedPackages} = require("./Scripts/@ByUser/Venryx.js");
		const overrideGroup = {
			name: "venryx",
			overrides_forSelf: {},
		};
		for (const name of exports.venryx_standardSymlinkedPackages) {
			// use relative paths, since yarn is more reliable with those fsr (last time I tried anyway)
			overrideGroup.overrides_forSelf[name] = `link:${vReposRoot_stepUpStr}/@Modules/${name}/Main`;
		}
		exports.config.dependencyOverrideGroups = [overrideGroup];
	}
}