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
import cookieParser from "cookie-parser";
import {CreateCommandsPlugin} from "web-vcore/nm/mobx-graphlink.js";
import {SetUpAuthHandling} from "./AuthHandling.js";
import {AuthenticationPlugin} from "./Mutations/AuthenticationPlugin.js";
import {CustomBuildHooksPlugin} from "./Plugins/CustomBuildHooksPlugin.js";
import {CustomInflectorPlugin} from "./Plugins/CustomInflectorPlugin.js";
import {InitApollo} from "./Utils/LibIntegrations/Apollo.js";
import {graph, InitGraphlink} from "./Utils/LibIntegrations/MobXGraphlink.js";

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
	//origin: "*", // let any origin make calls to our server (that's fine)
	origin: true, // must use true (ie. have response's "allowed-origin" always equal the request origin) instead of "*", since we have credential-inclusion enabled
	credentials: true, // allows cookies to be sent with requests (eg. for passing passportjs session-token with mutation/command calls)
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
	graph.subs.pgClient = pgClient;
});

// set up auth-handling before postgraphile; this way postgraphile resolvers have access to request.user
SetUpAuthHandling(app);

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
				//AuthenticationPlugin,
				CreateCommandsPlugin(),
			],
			skipPlugins: [
				require("graphile-build").NodePlugin,
			],
			async additionalGraphQLContextFromRequest(req, res) {
				// expose the express-js request and response objects on the postgraphile "context" object
				return {req, res};
			},
			dynamicJson: true,
			live: true,
			ownerConnectionString: dbURL, // passed in a 2nd time, for live-query module (connection-string with elevated privileges)
			//enableCors: true, // maybe temp; enables mutations, from any origin // disabled; use cors() above instead, as postgraphile just does "allow-origin: *", which causes error in browser (since credentials are included)
			showErrorStack: true,
			extendedErrors: ["hint", "detail", "errcode"], // to show error text in console (doesn't seem to be working)
			disableDefaultMutations: true, // we use custom mutations for everything, letting us use TypeScript+MobXGraphlink for all validations
		},
	),
);

// todo: MS server somehow confirms that the db-schema matches the "latest schema target" at startup (as derived from "Knex/Migrations/...")

// set up libs
InitApollo();
InitGraphlink();

app.listen(dbPort);
console.log("Server started.");