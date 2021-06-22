import {builtinModules} from "module";

// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

const forProd = process.env.NODE_ENV == "production";

import path from 'path';
const __dirname = path.join(path.dirname(decodeURI(new URL(import.meta.url).pathname))).replace(/^\\([A-Z]:\\)/, "$1");

//console.log("hi:", require("module").builtinModules);

/** @type {import("snowpack").SnowpackUserConfig } */
const config = {
	//root: "src",
	/*mount: {
	  "./": {url: "/"},
	},*/
	exclude: [
		`./Scripts/**/*`,
		`./Knex/**/*`,
		`./Build/**/*`,
		`./*.json`,
		`./*.js`
	].map(a => a.replace("./", __dirname.replace(/\\/g, "/") + "/")),
	workspaceRoot: process.env.NPM_LINK_ROOT, // needed so that same-version changes to linked-module files aren"t ignored (both for dev-server and prod-builds)
	/*alias: {
	},*/
	plugins: [
		/*[
		  "@snowpack/plugin-webpack",
		  {
			 outputPattern: {css: "../../Build/webpack/css/[name].[contenthash].css", js: "../../Build/webpack/js/[name].[contenthash].js", assets: "../../Build/webpack/assets/[name].[contenthash].[ext]"}
		  },
		],*/
	],
	packageOptions: {
		//external: require("module").builtinModules.concat(forProd ? ["react-vextensions", "react-vcomponents"] : []),
		knownEntrypoints: [
			// for packages that snowpack's auto-scanner misses // this seems to not work atm
			//"fast-json-patch",
			//"postgraphile/build/postgraphile/http/mapAsyncIterator".replace(/\//g, "\\"),
			//"iterall",
			//"util",
		],
		external: builtinModules.concat(
			"express", "postgraphile", "commander",
			"graphile-utils",
			//"pg-pool", "pg-native",
			"graphql",
			"@n1ru4l/graphql-live-query-patch",
			"iterall",
			"postgraphile/build/postgraphile/http/mapAsyncIterator",
			"postgraphile/build/postgraphile/http/mapAsyncIterator.js",
		),
		polyfillNode: true,
	},
	devOptions: {
		open: "none",
	},
	buildOptions: {
		out: "Build/esm",
		sourcemap: true,
	},
};
export default config;