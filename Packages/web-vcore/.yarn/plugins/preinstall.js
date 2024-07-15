const isInstall = process.argv[2] == "install" || process.argv[2] == null;
if (isInstall) {
	require("../../Scripts/@CJS/SyncDepsToOuterProject.js");
}