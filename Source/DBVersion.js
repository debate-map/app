var dbRootVersion = 2;

var env = process.env.NODE_ENV || "development";
var envSuffix =
	env == "development" ? "dev" :
	env == "production" ? "prod" :
	(()=>{throw new Error(`Environment must be either "development" or "production".`)})();
function DBPath(path, inVersionRoot = true) {
	/*let versionPrefix = path.match(/^v[0-9]+/);
	if (versionPrefix == null) // if no version prefix already, add one (referencing the current version)*/
	if (inVersionRoot)
		path = `v${dbRootVersion}-${envSuffix}/${path}`;
	return path;
};

module.exports = {dbRootVersion, envSuffix, DBPath};