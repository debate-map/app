function TryRequire(path) {
	try {
		require.resolve(path);
	} catch {
		return;
	}
	require(path);
}

// call yarn-pre-install script from web-vcore (if web-vcore is yarn-installed already)
TryRequire("web-vcore/Scripts/@CJS/YarnPreInstall.js");