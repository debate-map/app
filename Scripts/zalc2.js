const fs = require("fs");
const path = require("path");
const {execSync} = require("child_process");

// todo: turn this script into a standalone package, and make it more robust and flexible

// get first arg
const arg1 = process.argv[2];

// atm, using "./" is fine, since "npm run X" always runs X in the same folder as the package.json file that defines the script (ie. the repo-root in this case)
//const PathFromRoot = path=>`${__dirname}/../${path}`;
const PathFromRoot = path=>path;

/*class YarnSection {
	/** @type {string[]} *#/ lines;
	/** @type {string} *#/ packageName;
}
function ParseYarnSections(yarnLockText) {
	const sectionTexts = yarnLockText.split("\n\n");
	const sections = [];
	for (const sectionText of sectionTexts) {
		const lines = sectionText.split("\n");
		const section = new YarnSection();
		section.lines = lines;
		if (lines[0].startsWith(`"`) && lines[0].endsWith(`":`)) {
			section.packageName = lines[0].slice(1).replace(/@[^@]+$/, "");
		}
		sections.push(section);
	}
	return sections;
}
function SerializeYarnSections(sections) {
	return `${sections.map(a=>a.lines.join("\n")).join("\n\n")}\n`;
}*/

if (arg1 == "up" || arg1 == "down") {
	console.log("Updating package.json... (resolutions)");
	const pkgData = JSON.parse(fs.readFileSync(PathFromRoot(`package.json`), "utf8"));
	/*const yarnLockSections = ParseYarnSections(fs.readFileSync(PathFromRoot(`yarn.lock`), "utf8"));
	const yarnLockSectionsToRemove = [];*/
	SetResolutionsForPackagesInYalcFolder(pkgData, /*yarnLockSections, yarnLockSectionsToRemove,*/ PathFromRoot(`.yalc`), arg1);
	SetResolutionsForPackagesInYalcFolder(pkgData, /*yarnLockSections, yarnLockSectionsToRemove,*/ PathFromRoot(`Packages/web-vcore/.yalc`), arg1);
	fs.writeFileSync(PathFromRoot(`package.json`), JSON.stringify(pkgData, null, 2));

	/*if (yarnLockSectionsToRemove.length) {
		if (arg1 != "down") throw new Error("The yarn.lock file's contents should only be modified during a 'down' operation.");
		console.log(`Writing updated yarn.lock file... (removing resolutions to in-yalc packages: ${yarnLockSectionsToRemove.map(a=>a.packageName).join(", ")})`);
		for (const section of yarnLockSectionsToRemove) {
			const index = yarnLockSections.indexOf(section);
			if (index == -1) throw new Error("Failed to find section to remove.");
			yarnLockSections.splice(index, 1);
		}
		fs.writeFileSync(PathFromRoot(`yarn.lock`), SerializeYarnSections(yarnLockSections));
	}*/

	console.log("Running yarn install...");
	execSync("yarn install", {stdio: "inherit"});

	/*} finally {
		if (arg1 == "down") {
			console.log(`Restoring original names of yalc-dependency package.json files... (${tempRenamedJsonFiles.map(a=>a.packageName).join(", ")})`);
			for (const file of tempRenamedJsonFiles) {
				try {
					fs.renameSync(`${file.path}_tempDisabledByZalc`, file.path);
				} catch {
					console.log(`Failed to restore original name of file: ${file.path}_tempDisabledByZalc -> ${file.path}`);
				}
			}
		}
	}*/

	console.log("Done.");
}

function SetResolutionsForPackagesInYalcFolder(pkgData, /*yarnLockSections, yarnLockSectionsToRemove,*/ yalcFolderPath, operation) {
	// get folders under "../Packages/web-vcore/.yalc"
	for (const folderName of fs.readdirSync(yalcFolderPath)) {
		const packagesHere = [];
		if (folderName.startsWith("@")) {
			for (const subfolderName of fs.readdirSync(path.join(yalcFolderPath, folderName))) {
				packagesHere.push(`${folderName}/${subfolderName}`);
			}
		} else {
			packagesHere.push(folderName);
		}

		for (const package of packagesHere) {
			if (operation == "up") {
				pkgData.resolutions[package] = `portal:${yalcFolderPath}/${package}`;
			} else {
				delete pkgData.resolutions[package];

				// mangle the version in the package.json file, to force yarn to re-resolve the package to the npm-published version (rather than the prior yalc version, when using same version key)
				/*const packageJsonPath = `${yalcFolderPath}/${package}/package.json`;
				if (fs.existsSync(packageJsonPath)) {
					/*const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
					if (packageJson.version && !packageJson.version.includes("_disabledByZalc")) {
						packageJson.version += "_disabledByZalc";
					}
					fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));*#/
					fs.renameSync(packageJsonPath, `${packageJsonPath}_tempDisabledByZalc`);
					tempRenamedJsonFiles.push({path: packageJsonPath, packageName: package});
				}*/

				// for a 'down' operation, modify yarn.lock, to force-remove old package-resolutions that try to still point to the yalc folders (the point of the 'down' operation is to clear those linkages)
				/*for (let i = yarnLockSections.length - 1; i >= 0; i--) {
					/** @type {YarnSection} *#/ const section = yarnLockSections[i];
					//const matchesPackageName = section.lines[0]?.startsWith(`${package}@`);
					if (section.packageName == package && section.lines?.some(a=>a == `  version: 0.0.0-use.local`)) {
						//yarnLockSections.splice(i, 1);
						yarnLockSectionsToRemove.push(section);
					}
				}*/
			}
		}
	}
}