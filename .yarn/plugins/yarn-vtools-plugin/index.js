"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const module_1 = require("module");
const config = {};
//const plugin: Plugin<CoreHooks & PatchHooks> = {...};
//export {plugin as default};
//export default plugin;
//export default {
module.exports = {
    name: "yarn-vtools-plugin",
    factory: require => {
        const plugin = {
            configuration: config,
            commands: [],
            fetchers: [],
            resolvers: [
            //VResolver
            ],
            hooks: {
                /*setupScriptEnvironment(project, scriptEnv) {
                  scriptEnv.HELLO_WORLD = `my first plugin!`;
                },*/
                registerPackageExtensions: async (configuration, registerPackageExtension) => {
                    var _a, _b, _c, _d;
                    const paths = require("path");
                    const fs = require("fs");
                    const { structUtils } = require("@yarnpkg/core");
                    //const {copyPackage} = require("@yarnpkg/core/lib/structUtils") as typeof import ("@yarnpkg/core/lib/structUtils");
                    function DepNameToIdentHash(name) {
                        return structUtils.parseDescriptor(`${name}@*`, true).identHash;
                    }
                    function FindNameForIdentHash(identHash, deps) {
                        const entry = Array.from(deps.entries()).find(([key, value]) => value.identHash == identHash);
                        if (entry == null)
                            return `[could not find name for ident-hash: ${identHash}]`;
                        return entry[1].name;
                    }
                    //console.log("Yarn-vtools-plugin starting...");
                    const projectFolder = configuration.projectCwd.replace(/\\/g, "/").replace("/C:/", "C:/");
                    const packageJSONPath = paths.join(projectFolder, "package.json");
                    const packageJSONText = fs.readFileSync(packageJSONPath).toString();
                    const packageJSONObj = JSON.parse(packageJSONText);
                    let groups;
                    const yvtConfigPaths = [
                        paths.join(projectFolder, "YVTConfig.js"),
                        paths.join(projectFolder, "YVTConfig.mjs"),
                        paths.join(projectFolder, "YVTConfig.cjs"),
                    ];
                    const yvtConfigPath = yvtConfigPaths.find(a => fs.existsSync(a));
                    if (yvtConfigPath) {
                        console.log("Yarn-vtools-plugin starting. Config found at:", yvtConfigPath);
                        /*const yvtConfigJSON = fs.readFileSync(yvtConfigPath).toString();
                        const yvtConfigObj = JSON.parse(yvtConfigJSON);*/
                        const require_node = module_1.createRequire(projectFolder);
                        const yvtConfigFileExports = require_node(yvtConfigPath);
                        //console.log("yvtConfigFileExports:", yvtConfigFileExports);
                        const yvtConfigObj = yvtConfigFileExports.config;
                        groups = yvtConfigObj.dependencyOverrideGroups;
                    }
                    else if (packageJSONObj.dependencyOverrideGroups != null) {
                        console.log("Yarn-vtools-plugin starting. Config found in:", packageJSONPath);
                        groups = packageJSONObj.dependencyOverrideGroups;
                    }
                    else {
                        console.log("Yarn-vtools-plugin could not find config info, in project folder:", projectFolder);
                        return;
                    }
                    const regularDepsToOmit_byParentPackIdentHash = new Map();
                    for (const group of groups) {
                        if (!group)
                            continue;
                        // set default field values
                        group.omitPriorDeps_auto = (_a = group.omitPriorDeps_auto) !== null && _a !== void 0 ? _a : true;
                        console.log(`Preparing overrides group "${group.name}"...`);
                        // helper for most common case, of overriding the versions/protocols of project direct-dependencies (note: lacks some options that overrides_forDeps provides, like overrides for peer-deps)
                        if (group.overrides_forSelf) {
                            const selfPackage_descriptorStr = `${packageJSONObj.name}@*`;
                            const selfPackage_extensionData = { dependencies: {} };
                            for (const [depName, depVersion] of Object.entries(group.overrides_forSelf)) {
                                selfPackage_extensionData.dependencies[depName] = depVersion;
                            }
                            const selfPackage_descriptor = structUtils.parseDescriptor(selfPackage_descriptorStr, true);
                            registerPackageExtension(selfPackage_descriptor, selfPackage_extensionData);
                            const selfPackage_extensionData_identHashes = [
                                ...group.omitPriorDeps_auto ? Object.keys(group.overrides_forSelf).map(DepNameToIdentHash) : [],
                                ...group.omitPriorDeps_manual ? Object.keys(group.omitPriorDeps_manual).map(DepNameToIdentHash) : [],
                            ];
                            regularDepsToOmit_byParentPackIdentHash.set(selfPackage_descriptor.identHash, selfPackage_extensionData_identHashes);
                        }
                        for (const [packageDescriptor, packageOverrides] of Object.entries((_b = group.overrides_forDeps) !== null && _b !== void 0 ? _b : [])) {
                            const descriptor = structUtils.parseDescriptor(packageDescriptor, true);
                            registerPackageExtension(descriptor, packageOverrides);
                            const allPackageOverrides_identHashes = [
                                ...group.omitPriorDeps_auto ? Object.keys((_c = packageOverrides.dependencies) !== null && _c !== void 0 ? _c : {}).map(DepNameToIdentHash) : [],
                                ...group.omitPriorDeps_auto ? Object.keys((_d = packageOverrides.peerDependencies) !== null && _d !== void 0 ? _d : {}).map(DepNameToIdentHash) : [],
                                ...group.omitPriorDeps_manual ? Object.keys(group.omitPriorDeps_manual).map(DepNameToIdentHash) : [],
                            ];
                            regularDepsToOmit_byParentPackIdentHash.set(descriptor.identHash, allPackageOverrides_identHashes);
                        }
                    }
                    // override normalizePackage func to ignore dependencies with same names as overrides, so the overrides are always applied
                    // for ref, see: https://github.com/yarnpkg/berry/blob/master/packages/yarnpkg-core/sources/Configuration.ts#L1452
                    const normalizePackage_orig = configuration.normalizePackage;
                    configuration.normalizePackage = function (pkg) {
                        //const pkg_copy = copyPackage(pkg);
                        const pkg_copy = { ...pkg };
                        //console.log("Calling normalizePackage on:", pkg);
                        /*const pkg_deps_get_orig = pkg.dependencies.get;
                        pkg.dependencies.get = function(name: string) {
                            console.log("Checking:", name);
                            if (activeDepOverrides.has(name)) return;
                            return pkg_deps_get_orig.apply(this, arguments);
                        };
                        //console.log("Same:", pkg.dependencies.get == pkg_deps_get_orig);*/
                        /*const map_get_orig = Map.prototype.get;
                        Object.defineProperty(Map.prototype, "get", {
                            value: function(name: string) {
                                /*if (name != null && name.includes("react-vcomponents")) {
                                    console.log("Checking:", name);
                                }*#/
                                if (activeDepOverrides.has(name)) return;
                                return map_get_orig.apply(this, arguments);
                            }
                        });*/
                        //console.log("Checking:", pkg.identHash, "@against:", activeDepOverrides_byParentPackIdentHash.keys());
                        function OmitDepEntriesWithIdentHashMatching(deps, depsToOmit) {
                            const entries_filtered = Array.from(deps.entries()).filter(([key, value]) => {
                                //if (depsToOmit.includes(value.identHash)) console.log("Omitting dep from pkg.dependencies, since has override:", value.name);
                                return !depsToOmit.includes(value.identHash);
                            });
                            return new Map(entries_filtered);
                        }
                        if (regularDepsToOmit_byParentPackIdentHash.has(pkg.identHash)) {
                            const priorDepsToOmit_forThisPkg = regularDepsToOmit_byParentPackIdentHash.get(pkg.identHash);
                            const depsAndPeerDeps = new Map([...pkg.dependencies, ...pkg.peerDependencies]);
                            console.log("Omitting prior deps (so overrides will apply) for:", pkg.name, "\nDeps to omit/override:", priorDepsToOmit_forThisPkg.map(a => FindNameForIdentHash(a, depsAndPeerDeps)).join(","));
                            pkg_copy.dependencies = OmitDepEntriesWithIdentHashMatching(pkg.dependencies, priorDepsToOmit_forThisPkg);
                            pkg_copy.peerDependencies = OmitDepEntriesWithIdentHashMatching(pkg.peerDependencies, priorDepsToOmit_forThisPkg);
                            //pkg_copy.peerDependenciesMeta = OmitDepEntriesWithIdentHashMatching(pkg.peerDependenciesMeta, regularDepsToOmit_forThisPkg); // not needed
                        }
                        //const pkg_result = normalizePackage_orig.call(this, pkg);
                        const pkg_result = normalizePackage_orig.call(this, pkg_copy);
                        return pkg_result;
                    };
                },
            },
        };
        return plugin;
    },
};
