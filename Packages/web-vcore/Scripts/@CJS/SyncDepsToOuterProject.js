const {writeFileSync} = require("fs");
const wvcPkg = require("../../package.json");

// This script below finds the versions of each web-vcore subdependency (in web-vcore/package.json), and updates the package.json of the calling project to include those versions in the "resolutions" field of its package.json.

function GetDepsToConsolidate() {
	// these consolidations are done for a variety of reasons (see notes below)
	return [
		// standard/long-term (ie. under "/nm" folder) consolidations provided by web-vcore (there's a risk of issues either way, but the risk of consolidation is lower than the risk of multiple versions)
		// ==========

		// written by others
		...[
			// these packages very easily cause conflict if multiple exist in the dependency tree
			"@types/react",
			"@types/react-dom",
			"react",
			"react-dom",
			"mobx",
			"mobx-react",
		],
		// written by self (separate category, because consolidations for these should always be fine/good, since we know the different versions will be compatible anyway -- or at least easily modifiable to be so)
		...[
			"js-vextensions", // js (base)
			"react-vextensions", "react-vcomponents", "react-vmenu", "react-vmessagebox", "react-vscrollview", "react-vmarkdown", // +react
			//"graphql-forum", // +graphql
			"mobx-graphlink", // +mobx
			//"web-vcore", // +framework
			"webpack-runtime-require", // misc
		],

		// specialized/temporary consolidations
		// ==========

		...[
			// necessary consolidations, to fix issues
			//"mobx-firelink/node_modules/mobx": paths.base("node_modules", "mobx"), // fsr, needed to prevent 2nd mobx, when mobx-firelink is npm-linked [has this always been true?]

			// convenience consolidations, since they have npm-patches applied (and we don't want to have to adjust the match-counts)
			//"react-beautiful-dnd",
			//"@hello-pangea/dnd",
			"immer",
		],
	];
}

Start();
function Start() {
	//const outerPkg_path = "../../../../package.json";
	const outerPkg_path = `${process.cwd()}/package.json`;
	const outerPkg_old = require(outerPkg_path); // eslint-disable-line

	/** @type {Map<string, string>} */
	const outerPkg_wvcManagedResolutions = new Map();
	for (const depName of GetDepsToConsolidate()) {
		const depVersion = wvcPkg.dependencies[depName];
		if (depVersion == null) {
			console.log(`Dependency not found in web-vcore/package.json: ${depName}`);
			continue;
		}
		const exactVersionRegex = /^[\d.]+$/;
		if (depVersion.match(exactVersionRegex) == null) {
			console.log(`Dependency version is not exact ("${depVersion}"); skipping: ${depName}`);
			continue;
		}

		outerPkg_wvcManagedResolutions.set(depName, depVersion);
	}

	// keep a consistent order for the wvc-managed entries in "resolutions" (all at start, alphabetically sorted)
	const outerPkg_wvcManagedResolutions_sorted = new Map([...outerPkg_wvcManagedResolutions.entries()].sort((a, b)=>a[0].localeCompare(b[0])));
	const outerPkg_unmanagedResolutions = Object.entries(outerPkg_old.resolutions).filter(a=>!outerPkg_wvcManagedResolutions.has(a[0]));
	const outerPkg_newResolutions = Object.fromEntries([
		...outerPkg_wvcManagedResolutions_sorted,
		...outerPkg_unmanagedResolutions,
	]);

	const outerPkg_new = {...outerPkg_old, resolutions: outerPkg_newResolutions};
	writeFileSync(outerPkg_path, JSON.stringify(outerPkg_new, null, 2));
	console.log("Outer project's package.json was updated.");
}