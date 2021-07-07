import "./Start_0.js"; // this must come first // eslint-disable-line
import {GeneratePatchesPlugin} from "@pg-lq/postgraphile-plugin";
import {program} from "commander";
import cors from "cors";
import express from "express";
import {createRequire} from "module";
import pg from "pg";
import {makePluginHook, postgraphile} from "postgraphile";
//import "web-vcore/nm/js-vextensions_ApplyCETypes.ts";
import "web-vcore/nm/js-vextensions_ApplyCETypes.js";
import fetch from "node-fetch";
//import ws from "ws";
import cookieParser from "cookie-parser";
import {SetUpAuthHandling} from "./AuthHandling.js";
import {AuthenticationPlugin} from "./Mutations/Authentication.js";
import {CustomBuildHooksPlugin} from "./Plugins/CustomBuildHooksPlugin.js";
import {CustomInflectorPlugin} from "./Plugins/CustomInflectorPlugin.js";
import {InitPGLink} from "./Utils/LibIntegrations/PGLink.js";
import {InitGraphlink} from "./Utils/LibIntegrations/MobXGraphlink.js";

type PoolClient = import("pg").PoolClient;
const {Pool} = pg;
const require = createRequire(import.meta.url);

//program.option("-v, --variant <type>", "Which server variant to use (base, patches)");

program.parse(process.argv);
export const launchOpts = program.opts();
export const variant = launchOpts.variant;

if (!globalThis.fetch) {
	globalThis.fetch = fetch;
}
/*if (!globalThis.WebSocket) {
	const WebSocket = require("ws");
	globalThis.WebSocket = WebSocket;
}*/

const app = express();

app.use(cors({
	//origin: "debatemap.app",
	origin: "*", // let any origin make calls to our server (that's fine)
}));

app.use(cookieParser());
// enable parsing of different request body types 
app.use(express.json()); // application/json
//app.use(express.urlencoded({extended: false})); // application/x-www-form-urlencoded
app.use(express.urlencoded({extended: true})); // application/x-www-form-urlencoded

const dbURL = process.env.DATABASE_URL || `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@localhost:5432/debate-map`;
const dbPort = process.env.PORT || 3105 as number;

const pluginHook = makePluginHook([
	variant == "patches" && new GeneratePatchesPlugin(),
] as any[]);

export const pgPool = new Pool({
	connectionString: dbURL,
});
export var pgClient: PoolClient;
pgPool.on("connect", client=>{
	if (pgClient != null) console.warn("pgClient recreated...");
	pgClient = client;
});
app.use(
	postgraphile(
		pgPool,
		"app_public",
		{
			watchPg: true,
			graphiql: true,
			enhanceGraphiql: true,
			// server/cli plugins
			pluginHook,
			// schema-builder plugins
			appendPlugins: [
				CustomBuildHooksPlugin,
				require("@graphile-contrib/pg-simplify-inflector"),
				require("@graphile/subscriptions-lds").default,
				require("postgraphile-plugin-connection-filter"),
				CustomInflectorPlugin,
				//CustomWrapResolversPlugin,
				AuthenticationPlugin,
			],
			skipPlugins: [
				require("graphile-build").NodePlugin,
			],
			dynamicJson: true,
			live: true,
			ownerConnectionString: dbURL, // passed in a 2nd time, for live-query module (connection-string with elevated privileges)
			enableCors: true, // cors flag temporary; enables mutations, from any origin
			showErrorStack: true,
			extendedErrors: ["hint", "detail", "errcode"], // to show error text in console (doesn't seem to be working)

			// test
			/*simpleCollections: "only",
			graphileBuildOptions: {
				pgOmitListSuffix: true,
			},*/
		},
	),
);

SetUpAuthHandling(app);
// todo: MS server somehow confirms that the db-schema matches the "latest schema target" at startup (as derived from "Knex/Migrations/...")

// set up libs
InitPGLink();
InitGraphlink();

app.listen(dbPort);
console.log("Server started.");