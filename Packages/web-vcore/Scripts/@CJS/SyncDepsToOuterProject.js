const {existsSync, writeFileSync} = require("fs");
const paths = require("path");
const wvcPkg = require("../../package.json");

// This script below finds the versions of each web-vcore subdependency (in web-vcore/package.json), and updates the package.json of the calling project to include those versions in the "resolutions" field of its package.json.

function GetDepsToConsolidate() {
	// these consolidations are done for a variety of reasons (see notes below)
	return [
		// standard/long-term consolidations provided by web-vcore (there's a risk of issues either way, but the risk of consolidation is lower than the risk of multiple versions)
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

			// these packages used to be among the "web-vcore/nm/XXX" entries; these need a closer look eventually to determine which ones are worth consolidating (for now we just continue doing so)
			"@apollo/client",
			"@hello-pangea/dnd",
			"chroma-js",
			"codemirror",
			"graphql-tag",
			"graphql",
			"moment",
			"raven-js",
			"rc-slider",
			"rc-tooltip",
			"react-universal-hooks",
			"subscriptions-transport-ws",
			"uplot",
		],
		// written by self (separate category, because consolidations for these should always be fine/good, since we know the different versions will be compatible anyway -- or at least easily modifiable to be so)
		...[
			//"eslint-config-vbase", // commented; not needed, since eslint-config-vbase is only used by web-vcore itself
			//"graphql-forum",
			"js-vextensions",
			"mobx-graphlink",
			"uplot-vplugins",
			"webpack-runtime-require",
			//"web-vcore",

			// react
			"react-uplot",
			"react-vcomponents",
			"react-vextensions",
			"react-vmarkdown",
			"react-vmenu",
			"react-vmessagebox",
			"react-vscrollview",
		],

		// specialized/temporary consolidations
		// ==========

		...[
			// necessary consolidations, to fix issues
			//"mobx-firelink/node_modules/mobx": paths.base("node_modules", "mobx"), // fsr, needed to prevent 2nd mobx, when mobx-firelink is npm-linked [has this always been true?]

			// convenience consolidations, since they have npm-patches applied (and we don't want to have to adjust the match-counts)
			"immer",
		],
	];
}

/*const bufferedLogs = [];
function BufferLog(message) {
	bufferedLogs.push(message);
}
function PrintBufferedLogs() {
	for (const log of bufferedLogs) {
		console.log(log);
	}
}*/

Start();
function Start() {
	let userProjectRoot = process.cwd();
	while (!existsSync(`${userProjectRoot}/yarn.lock`)) {
		const oldVal = userProjectRoot;
		userProjectRoot = paths.normalize(`${userProjectRoot}/..`);
		if (userProjectRoot == oldVal) {
			console.log(`Yarn pre-install (web-vcore): Could not find yarn.lock file in directory, or any parent directory; skipping execution.`);
			return;
		}
	}

	//const outerPkg_path = "../../../../package.json";
	const outerPkg_path = `${userProjectRoot}/package.json`;
	const outerPkg_old = require(outerPkg_path); // eslint-disable-line

	/** @type {Map<string, string>} */
	const outerPkg_wvcManagedResolutions = new Map();
	for (const depName of GetDepsToConsolidate()) {
		const versionIsExact = version=>version.match(/^[\d.]+$/) != null;

		const depVersion_wvc = wvcPkg.dependencies[depName];
		if (depVersion_wvc == null) {
			console.log(`Dependency version not specified in web-vcore/package.json, for package-to-consolidate: ${depName}`);
		} else if (!versionIsExact(depVersion_wvc)) {
			console.log(`Dependency version specified in web-vcore/package.json ("${depVersion_wvc}") is invalid (must be exact), for package-to-consolidate: ${depName}`);
		} else {
			outerPkg_wvcManagedResolutions.set(depName, depVersion_wvc);
		}

		// if user provided a version override (in "resolutions_wvcOverrides" field of their package.json), use that instead
		const depVersion_override = outerPkg_old.resolutions_wvcOverrides?.[depName];
		if (depVersion_override == null) {
			// do nothing; user has no need to specify overrides
		} else if (!versionIsExact(depVersion_override)) {
			console.log(`Dependency version specified in user project's package.json ("${depVersion_override}") is invalid (must be exact), for package-to-consolidate: ${depName}`);
		} else {
			outerPkg_wvcManagedResolutions.set(depName, depVersion_override);
		}
	}

	// keep a consistent order for the wvc-managed entries in "resolutions" (all at start, alphabetically sorted)
	const outerPkg_wvcManagedResolutions_sorted = new Map([...outerPkg_wvcManagedResolutions.entries()].sort((a, b)=>a[0].localeCompare(b[0])));
	const outerPkg_unmanagedResolutions = Object.entries(outerPkg_old.resolutions ?? {}).filter(a=>!outerPkg_wvcManagedResolutions.has(a[0]));
	const outerPkg_newResolutions = Object.fromEntries([
		...outerPkg_wvcManagedResolutions_sorted,
		...outerPkg_unmanagedResolutions,
	]);

	const outerPkg_new = {...outerPkg_old, resolutions: outerPkg_newResolutions};
	const resolutions_oldJSON = JSON.stringify(outerPkg_old.resolutions, null, 2);
	const resolutions_newJSON = JSON.stringify(outerPkg_new.resolutions, null, 2);
	if (resolutions_oldJSON == resolutions_newJSON) {
		console.log(`Yarn pre-install (web-vcore): The "resolutions" field of the outer project's package.json was already up-to-date.`);
		return;
	}

	// wait to print these buffered logs until we're sure we're actually going to make changes (too noisy to be worth including unless an actual dependency version-change was made)
	//PrintBufferedLogs();
	writeFileSync(outerPkg_path, JSON.stringify(outerPkg_new, null, 2));
	console.log("Yarn pre-install (web-vcore): Outer project's package.json was updated.");
}