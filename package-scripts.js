function TSScript(scriptPath) {
	const envPart = `TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true`;
	const nodeFlags = `--loader ts-node/esm.mjs --experimental-specifier-resolution=node`;
	return `cross-env ${envPart} node ${nodeFlags} ${scriptPath}`;
}

module.exports = {
	scripts: {
		clean: "shx rm -rf Dist",
		//compile: 'cross-env DEBUG=\'app:*\' ts-node --project Scripts/tsconfig.json --ignore none Scripts/Bin/Compile',
		compile: TSScript("Scripts/Bin/Compile"),
		/*lint: {
			default: "eslint Source Tests Scripts",
			fix: 'nps "lint --fix"',
		},*/
		//dev: 'nps "bakeConfig nodemon Scripts/Bin/Server --watch Scripts --max_old_space_size=4096"',
		//dev: 'nps "bakeConfig ts-node-dev --project Scripts/tsconfig.json Scripts/Bin/Server"',
		//dev: 'cross-env-shell NODE_ENV=development DEBUG=\'app:*\' _USE_TSLOADER=true NODE_OPTIONS="--max-old-space-size=4096 --experimental-modules" "npm start bake-config && npm start dev-part2"',
		dev: {
			default: 'cross-env-shell NODE_ENV=development DEBUG=\'app:*\' _USE_TSLOADER=true NODE_OPTIONS="--max-old-space-size=4096" "npm start bake-config && npm start dev.part2"',
			noDebug: 'nps "dev --no_debug"',
			//part2: 'cross-env TS_NODE_OPTIONS="--experimental-modules" ts-node-dev --project Scripts/tsconfig.json Scripts/Bin/Server.ts',
			//part2: 'cross-env NODE_OPTIONS="--experimental-modules" ts-node --project Scripts/tsconfig.json Scripts/Bin/Server.ts',
			//part2: "cross-env ts-node-dev --project Scripts/tsconfig.json --ignore none Scripts/Bin/Server.ts",
			part2: TSScript("Scripts/Bin/Server"), // for now, call directly; no ts-node-dev [watching] till figure out use with new type:module approach

			//withStats: 'cross-env-shell NODE_ENV=development DEBUG=\'app:*\' _USE_TSLOADER=true OUTPUT_STATS=true NODE_OPTIONS="--max-old-space-size=4096 --experimental-modules" "npm start bake-config && ts-node-dev --project Scripts/tsconfig.json Scripts/Bin/Server"',
			withStats: 'cross-env-shell NODE_ENV=development DEBUG=\'app:*\' _USE_TSLOADER=true OUTPUT_STATS=true NODE_OPTIONS="--max-old-space-size=4096" "npm start bake-config && ts-node-dev --project Scripts/tsconfig.json --ignore none Scripts/Bin/Server"',
		},
		//bakeConfig: 'cross-env DEBUG=\'app:*\' NODE_OPTIONS="--experimental-modules" ts-node Scripts/Bin/BakeConfig.ts',
		//bakeConfig: 'cross-env DEBUG=\'app:*\' TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true node --loader ts-node/esm.mjs --experimental-specifier-resolution=node Scripts/Bin/BakeConfig.ts [working]',
		//bakeConfig: 'cd Scripts && cross-env DEBUG=\'app:*\' TS_NODE_SKIP_IGNORE=true TS_NODE_TRANSPILE_ONLY=true node --loader ts-node/esm.mjs --experimental-specifier-resolution=node Bin/BakeConfig.ts [working]',
		bakeConfig: TSScript("Scripts/Bin/BakeConfig.ts"),
		cypress: {
			open: "cypress open",
			run: "cypress run",
		},
		build: {
			default: 'cross-env-shell DEBUG=\'app:*\' "npm start clean && npm start compile"',
			dev: "cross-env NODE_ENV=development DEBUG='app:*' npm start build",
			prod: "cross-env NODE_ENV=production DEBUG='app:*' npm start build",
			prodQuick: "cross-env NODE_ENV=production DEBUG='app:*' QUICK=true npm start build",
		},
		//justDeploy: 'ts-node ./Scripts/Build/Deploy',
		justDeploy: {
			dev: "firebase deploy -P dev",
			prod: "firebase deploy -P prod",
		},
		deploy: {
			dev: 'cross-env-shell NODE_ENV=development DEBUG=\'app:*\' _USE_TSLOADER=true "npm start bake-config && npm start build && npm start just-deploy.dev"',
			prod: 'cross-env-shell NODE_ENV=production DEBUG=\'app:*\' "npm start bake-config && npm start build && npm start just-deploy.prod"',
			prodQuick: 'cross-env-shell NODE_ENV=production DEBUG=\'app:*\' QUICK=true "npm start bake-config && npm start build && npm start just-deploy.prod"',
		},
		deployDBBackupApp: "gcloud app deploy Tools/DBBackupApp/app.yaml Tools/DBBackupApp/cron.yaml",
		//buildStats: 'webpack --config Scripts/Build/WebpackConfig.ts --output-file ForStats/Bundle.js --profile --json > BuildStats.json',
		buildStats: "webpack --config Scripts/Build/WebpackConfig.ts --output-file ForStats/Bundle.js --profile --json > Dist/ForStats/BuildStats.json",
	},
};