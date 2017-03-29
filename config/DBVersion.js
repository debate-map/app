var dbRootVersion = 1;

var env = process.env.NODE_ENV || "development";
var suffix =
	env == "development" ? "dev" :
	env == "production" ? "prod" :
	(()=>{throw new Error(`Environment must be either "development" or "production".`)})();
function DBPath(path) {
	let versionPrefix = path.match(/^v[0-9]+/);
	if (versionPrefix == null) // if no version prefix already, add one (referencing the current version)
		path = `v${dbRootVersion}-${suffix}/${path}`;
	return path;
};

module.exports = {dbRootVersion, DBPath};