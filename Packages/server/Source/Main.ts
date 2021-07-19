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
import {CreateCommandsPlugin, GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";
import {Assert} from "web-vcore/nm/js-vextensions";
import {SetUpAuthHandling} from "./AuthHandling.js";
import {AuthenticationPlugin, AuthExtrasPlugin} from "./Mutations/AuthenticationPlugin.js";
import {CustomBuildHooksPlugin} from "./Plugins/CustomBuildHooksPlugin.js";
import {CustomInflectorPlugin} from "./Plugins/CustomInflectorPlugin.js";
import {InitApollo} from "./Utils/LibIntegrations/Apollo.js";
import {graph, InitGraphlink} from "./Utils/LibIntegrations/MobXGraphlink.js";
//import {OtherResolversPlugin} from "./Plugins/OtherResolversPlugin.js";

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
export const serverLaunchID = GenerateUUID(); // token used to identify the server-to-server websocket

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

/*let req_real;
app.use((req, res, next)=>{
	req_real = req;
	next();
});*/

let serverWS_currentCommandUserID: string|n;

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
				AuthExtrasPlugin,
				//OtherResolversPlugin,
				CreateCommandsPlugin({
					preCommandRun: info=>{
						//console.log("User in command resolver:", info.context.req.user?.id);
						Assert(info.context.req.user != null, "Cannot run command on server unless logged in.");
						console.log(`Preparing to run command "${info.command.constructor.name}". @args:`, info.args, "@userID:", info.context.req.user.id);
						serverWS_currentCommandUserID = info.context.req.user.id;
					},
					postCommandRun: info=>{
						if (info.error) {
							console.log(`Command "${info.command.constructor.name}" errored! @error:`, info.error);
						} else {
							console.log(`Command "${info.command.constructor.name}" done! @returnData:`, info.returnData);
						}
						serverWS_currentCommandUserID = null;
					},
				}),
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

			//pgDefaultRole: "pg_execute_server_program", // have postgraphile use the "pg_execute_server_program" user for client requests (which, by default, has no beyond-base permissions), rather than the "postgres" superuser (needed for RLS policies to work)
			pgSettings: req=>{
				const settings = {};

				//const isServerWS = req.headers.searchLaunchID && req.headers.searchLaunchID == serverLaunchID;
				//const isServerWS = req.headers.Authorization && req.headers.Authorization == serverLaunchID;
				const isServerWS = req.headers.authorization && req.headers.authorization == serverLaunchID;
				console.log("Settings:", settings, "@req:", req.headers);
				if (isServerWS) {
					// have postgraphile use the "postgres" user for server-to-server-ws requests (which is used for db-requests within Command runs)
					//settings["role"] = "postgres";

					console.log("Making pg-request, for server-to-server websocket connection (for ws init, and Command runs). @currentCommandUserID:", serverWS_currentCommandUserID);
					//Assert(serverWS_currentCommandUserID, "serverWS_currentCommandUserID is null!");
					if (serverWS_currentCommandUserID) {
						settings["app.current_user_id"] = serverWS_currentCommandUserID; // if user isn't signed-in, still set setting (else RLS errors)
					}
				} else {
					// have postgraphile use the "app_user" user for client requests, rather than the "postgres" superuser (needed for RLS policies to work)
					settings["role"] = "app_user";

					// make user-id accessible to Postgres sql-code, so RLS can function
					settings["app.current_user_id"] = req["user"]?.id ?? "[not signed in]"; // if user isn't signed-in, still set setting (else RLS errors)
				}

				return settings;
			},
		},
	),
);

// todo: MS server somehow confirms that the db-schema matches the "latest schema target" at startup (as derived from "Knex/Migrations/...")

// set up libs
InitApollo(serverLaunchID);
InitGraphlink();

app.listen(dbPort);
console.log("Server started.");