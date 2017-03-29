var dbRootVersion = module.exports.dbRootVersion = 1;
module.exports.DBPath = function(path) {
	let versionPrefix = path.match(/^v[0-9]+/);
	if (versionPrefix == null) // if no version prefix already, add one (referencing the current version)
		path = `v${dbRootVersion}/${path}`;
	return path;
};