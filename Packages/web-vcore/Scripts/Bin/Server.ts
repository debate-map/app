import express from "express";
import debug_base from "debug";
import webpack from "webpack";
import devMiddleware from "webpack-dev-middleware";
import connectHistoryAPIFallback from "connect-history-api-fallback";
import pathModule from "path";
import type {CreateConfig_ReturnType} from "../Config";
import {DEV} from "../EnvVars/ReadEnvVars.js";
//import fs from "fs";

const debug = debug_base("app:server");

export const prefixesToServe_default = [
	// standard folders under "Resources" in my projects
	"/Fonts/", "/Images/", "/SVGs/",
	// standard files (directly) under "Resources" in my projects
	"/robots.txt",
	// other standard files output into the "Dist" folder in my projects
	"/index.html", "/app.js", "/app.js.map", "/app.css", "/app.css.map",
];
export const extToServe_default = [
	"html", "js", "css", "map",
	"png", "jpg",
	"ttf", "otf", "woff", "woff2",
	"txt", "wasm",
];

export function Serve(
	config: CreateConfig_ReturnType,
	webpackConfig: webpack.Configuration|null,
	prefixesToServe = prefixesToServe_default,
	// extensions to serve (without a redirect to "index.html")
	// note: perhaps should leave empty, since prefix approach should be sufficient, and is arguably better (eg. keeps redirects working for content ids that happen to end with these extensions)
	// [that said, it doesn't matter that much, since these exceptions are only for development/webpack anyway; eg. in production, my web-servers tend to use approach of only redirecting if no file at given path is found]
	extToServe = extToServe_default,
	writeToDisk = undefined,
) {
	const paths = config.utils_paths;
	const app = express();

	// This rewrites all routes requests to the root /index.html file (ignoring file requests).
	// If you want to implement universal rendering, you'll want to remove this middleware.
	app.use(connectHistoryAPIFallback({
		rewrites: [
			{
				from: new RegExp(
					`^`
					+ `(?!(${prefixesToServe.join("|")}))` // paths starting with these prefixes will NOT be redirected to "index.html"
					+ `(.(?!\\.(${extToServe.join("|")})))*$`, // paths with these extensions will NOT be redirected to "index.html"
				),
				to(context) {
					if (webpackConfig?.output?.publicPath) {
						return `${webpackConfig.output.publicPath}/index.html`;
					}
					return "/index.html";
				},
			},
		],
	}));

	// apply webpack HMR middleware
	// ----------

	if (DEV) {
		if (webpackConfig == null) throw new Error("If DEV, webpackConfig must be non-null.");
		if (webpackConfig.stats != null && JSON.stringify(webpackConfig.stats) != JSON.stringify(config.compiler_stats)) {
			throw new Error("Webpack config contains a 'stats' property, but it will be ignored, since its superseded by the 'compiler_stats' config property.");
		}
		const compiler = webpack(webpackConfig);

		//compiler.apply(new webpack.ProgressPlugin({ profile: true }));
		//compiler.apply(new webpack.ProgressPlugin());

		debug("Enable webpack dev and HMR middleware");
		app.use(devMiddleware(compiler, {
			// removed from webpack 5 update apparently
			/*publicPath: webpackConfig.output.publicPath,
			contentBase: paths.source(),
			hot: config.useHotReloading,
			quiet: config.compiler_quiet,
			noInfo: config.compiler_quiet,
			lazy: false,
			progress: true,*/

			stats: config.compiler_stats,
			writeToDisk,
			/* watchOptions: {
				// makes-so a typescript-recompile (with multiple changed files) only triggers one webpack-recompile
				// [not needed anymore, since using tsc-watch]
				//aggregateTimeout: 2000,
				//ignored: "^(?!.*TSCompileDone\.marker)", // ignore all files other than special "TSCompileDone.marker" file
				//ignored: "**#/*",
				ignored: "!./Source_JS/TSCompileDone.marker",
			} */
		}));
		if (config.useHotReloading) {
			//app.use(hotMiddleware(compiler));
		}

		// app.use(express.static(paths.dist())); // enable static loading of files in Dist, for dll.vendor.js
	} else {
		console.log(
			`Server is being run outside of live development mode, meaning it will only serve the compiled application bundle in ~/Dist.${""
			} Generally you do not need an application server for this and can instead use a web server such as nginx to serve your static files.`,
		);

		// Serving ~/Dist by default. Ideally these files should be served by the web server and not the app server, but this helps to demo the server in production.
		app.use(express.static(paths.dist()));
		//console.log("Path:", paths.dist(), "@files:", fs.readdirSync(paths.dist()));
	}

	// serve static assets from resource folders, since webpack is unaware of these files (in dev-mode only, since resources are hard-copied into ~/Dist when app is compiled, in Compile.ts)
	for (const resourceFolder of config.resourceFolders) {
		app.use(express.static(paths.base(resourceFolder.sourcePath)));
	}
	// for resource-file entries, just serve each one's containing folder (this only happens for devs, so should be fine; for prod, Compile.ts only copies the specific files listed)
	//const resourceFileFolders = config.resourceFiles.map(a=>pathModule.dirname(a.sourcePath)).filter((entry, i, arr)=>arr.indexOf(entry) == i);
	/*const resourceFileFolders = [...new Set(config.resourceFiles.map(a=>pathModule.dirname(a.sourcePath)))];
	for (const resourceFileFolder of resourceFileFolders) {
		app.use(express.static(paths.base(resourceFileFolder)));
	}*/
	// for resource-file entries, serve each one to its specific destination path (since "app.use(express.static(...))" is built for folders and doesn't let you specify dest-subpath)
	for (const resourceFile of config.resourceFiles) {
		const fileName = pathModule.basename(resourceFile.sourcePath);
		app.use(`/${resourceFile.destSubpath ?? fileName}`, express.static(paths.base(resourceFile.sourcePath)));
	}

	const port = config.server_port;
	app.listen(port);
	debug(`Server is now running at http://localhost:${port}.`);
}