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
import {AddSchema, CreateCommandsPlugin, GenerateUUID, GetAsync, GetSchemaJSON, mglClasses, schemaEntryJSONs, UserInfo} from "web-vcore/nm/mobx-graphlink.js";
import {Assert, FancyFormat} from "web-vcore/nm/js-vextensions.js";
import {AddWVCSchemas} from "web-vcore/Dist/Utils/General/WVCSchemas.js";
import {GetUserHiddensWithEmail, User} from "dm_common";
import {SetUpAuthHandling} from "./AuthHandling.js";
import {AuthExtrasPlugin} from "./Mutations/AuthenticationPlugin.js";
import {DBPreloadPlugin} from "./Mutations/DBPreloadPlugin.js";
import {CustomBuildHooksPlugin} from "./Plugins/CustomBuildHooksPlugin.js";
import {CustomInflectorPlugin} from "./Plugins/CustomInflectorPlugin.js";
import {InitApollo} from "./Utils/LibIntegrations/Apollo.js";
import {graph, InitGraphlink} from "./Utils/LibIntegrations/MobXGraphlink.js";
import {PostGraphileFulltextFilterPlugin} from "./Plugins/FullTextFilterPlugin.js";
//import {OtherResolversPlugin} from "./Plugins/OtherResolversPlugin.js";

type PoolClient = import("pg").PoolClient;
const {Pool} = pg;
const require = createRequire(import.meta.url);

//program.option("-v, --variant <type>", "Which server variant to use (base, patches)");

// for testing scaffold-sync
/*while (true) {
	//console.log("TestUpdate_early:", fs.readFileSync("/dm_repo/node_modules/web-vcore/nm/js-vextensions.js").toString());
	console.log("TestUpdate:", FancyFormat({}, Date.now()));
	await new Promise(resolve=>setTimeout(resolve, 1000));
}*/

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
	// todo: change "origin" to be a function, that only accepts CORS from a hard-coded list of origins

	credentials: true, // allows cookies to be sent with requests (eg. for passing passportjs session-token with mutation/command calls)
}));

app.use(cookieParser());
// enable parsing of different request body types 
app.use(express.json()); // application/json
//app.use(express.urlencoded({extended: false})); // application/x-www-form-urlencoded
app.use(express.urlencoded({extended: true})); // application/x-www-form-urlencoded

const env = process.env;
let dbURL = env.DATABASE_URL;
const inK8s = env.DB_USER != null;
if (dbURL == null) {
	if (inK8s) {
		console.log(`Connecting app-server's pg-client to: postgres://${env.DB_USER}:<redacted>@${env.DB_ADDR}:${env.DB_PORT}/debate-map`);
		dbURL = `postgres://${env.DB_USER}:${encodeURIComponent(env.DB_PASSWORD!)}@${env.DB_ADDR}:${env.DB_PORT}/debate-map`;
	} else {
		console.log(`Connecting app-server's pg-client to: postgres://${env.PGUSER}:<redacted>@localhost:5432/debate-map`);
		dbURL = `postgres://${env.PGUSER}:${encodeURIComponent(env.DBPASSWORD!)}@localhost:5432/debate-map`;
	}
}

const pluginHook = makePluginHook([
	// todo: turn this variant on, and add the client-side plugin, for more efficient list-change messages
	variant == "patches" && new GeneratePatchesPlugin(),
] as any[]);

pg.defaults.poolSize = 10;
export const pgPool = new Pool({
	connectionString: dbURL,
});
graph.subs.pgPool = pgPool;
//export var pgClient: PoolClient;
pgPool.on("connect", client=>{
	console.log(`A pgClient has been created in the pool. New pool size:`, pgPool.totalCount);
	//pgClient = client;
	//graph.subs.pgPool = pgClient;
});
pgPool.on("remove", async client=>{
	console.log("A pgClient in the pool has been disconnected. New pool size:", pgPool.totalCount, pgPool.totalCount == 0 ? "[attempting new connection...]" : "");
	if (pgPool.totalCount == 0) {
		await pgPool.connect();
		//console.log("A pgClient in the pool has been disconnected. New pool size:", pgPool.totalCount);
	}
});

app.get("/health-check", async(req, res)=>{
	console.log("Starting health-check.");
	try {
		Assert(pgPool.totalCount > 0, "No pgClient has been initialized/connected within the pool yet.");

		const usersCount = await pgPool.query("SELECT count(*) FROM (SELECT 1 FROM users LIMIT 10) t;");
		Assert(usersCount.rowCount >= 1, "Could not find any users in database. (at least the system user should exist)");
		console.log("Health-check: Passed 1");

		//const existingUser_hidden = await Timeout_5s(1, GetAsync)(()=>GetUserHiddensWithEmail("debatemap@gmail.com")[0], {errorHandling_final: "log"});
		const existingUser_hidden = await GetAsync(()=>GetUserHiddensWithEmail("debatemap@gmail.com")[0], {errorHandling_final: "log"});
		console.log("Health-check: Passed 2");
		Assert(existingUser_hidden != null, "Could not find system-user's user-hidden data, which we know should exist.");
		console.log("Health-check: Passed 3");

		console.log("Health-check: Good.");
		res.sendStatus(200); // status: 200 OK
	} catch (ex) {
		console.log("Health-check: Bad. Error:", ex);
		res.sendStatus(500); // status: 500 Internal Server Error
		// try to reconnect the pool
		pgPool.connect();
	}
});

// set up auth-handling before postgraphile; this way postgraphile resolvers have access to request.user
SetUpAuthHandling(app);

/*let req_real;
app.use((req, res, next)=>{
	req_real = req;
	next();
});*/

//let serverWS_currentCommandUserID: string|n;
let serverWS_currentCommandUser: User|n;

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
				//require("@pyramation/postgraphile-plugin-fulltext-filter"),
				PostGraphileFulltextFilterPlugin,
				CustomInflectorPlugin,
				//CustomWrapResolversPlugin,
				//AuthenticationPlugin,
				AuthExtrasPlugin,
				//DBPreloadPlugin,
				//OtherResolversPlugin,
				CreateCommandsPlugin({
					schemaDeps_auto: true,
					// till we find way to auto-avoid conflicts with pgl introspection types, use this // commented; not needed anymore, since "get-graphql-from-jsonschema" adds "T0" to end of type-names
					//schemaDeps_auto_exclude: mglClasses.filter(a=>a["_table"] != null).map(a=>a.name),
					//schemaDeps_auto_exclude: ["MapView", "MapNodeView"], // exclude classes we know aren't needed for the graphql api, and which cause warnings (eg. "$ref" cycles)
					//schemaDeps: ["MapNode_Partial", "MapNodeRevision_Partial"],
					/*typeDefFinalizer: typeDef=>{
						function CleanUpGraphQLTypeName(name: string) {
							if (name.includes("T0")) name = name.replace(/T0/g, ".").replace(/\.$/, "");
							return name;
						}
						typeDef.name = CleanUpGraphQLTypeName(typeDef.name);
						typeDef.str = typeDef.str.replace(/(\W)(.*?T0.*?)(\W)/g, (str, g1, typeName, g3)=>{
							return `${g1}${CleanUpGraphQLTypeName(typeName)}${g3}`;
						});
						return typeDef;
					},*/
					typeDefStrFinalizer: str=>{
						const replacements = {
							//Uuid: "UUID",
							// replace refs to scalar json-schemas, with just their scalar type (no graphql types are created for these, since graphql can't represent them as a separate type)
							// commented; now automated within mobx-graphlink (in FindGQLTypeName())
							//UUIDT0: "String",
						};

						// undo the underscore-removing that jsonschema2graphql does
						/*for (const key of schemaEntryJSONs.keys()) {
							if (key.includes("_")) {
								replacements[key.replace(/_/g, "")] = key;
							}
						}*/

						for (const [from, to] of Object.entries(replacements)) {
							//str = str.replace(new RegExp(from, "g"), to);
							str = str.replace(new RegExp(`(^|[^a-zA-Z0-9_])(${from})([^a-zA-Z0-9_]|$)`, "g"), (matchStr, g1, typeName, g3)=>{
								return `${g1}${to}${g3}`;
							});
						}

						return str;
					},
					//logTypeDefs: true,
					//logTypeDefs_detailed: ["PermissionSet"],

					preCommandRun: info=>{
						//console.log("User in command resolver:", info.context.req.user?.id);
						Assert(info.context.req.user != null, "Cannot run command on server unless logged in.");
						console.log(`Preparing to run command "${info.command.constructor.name}". @args:`, info.args, "@userID:", info.context.req.user.id);
						serverWS_currentCommandUser = info.context.req.user;
					},
					postCommandRun: info=>{
						if (info.error) {
							const commandInfoStr_deep = FancyFormat({toJSON_opts: {
								trimDuplicates: true,
								entryReplacer_post: (key, value)=>{
									//if (typeof value == "object" && value?.options?.graph) {
									if (key == "options" && value?.graph) {
										return {$omit: true};
									}
								},
							}}, info.command);
							console.error(`Command "${info.command.constructor.name}" errored!`,
								`\n@Command:`, commandInfoStr_deep, // NodeJS logging doesn't show deep enough
								`\n@error:`, info.error);
						} else {
							console.log(`Command "${info.command.constructor.name}" done! @returnData:`, info.returnData);
						}
						serverWS_currentCommandUser = null;
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
				//console.log("Settings:", settings, "@req:", req.headers);
				if (isServerWS) {
					// have postgraphile use the "postgres" user for server-to-server-ws requests (which is used for db-requests within Command runs)
					//settings["role"] = "postgres";

					console.log("Making pg-request, for server-to-server websocket connection (for ws init, and Command runs). @currentCommandUserID:", serverWS_currentCommandUser?.id);
					//Assert(serverWS_currentCommandUser?.id, "serverWS_currentCommandUser is null!");
					SetUserFlags(serverWS_currentCommandUser);
				} else {
					// have postgraphile use the "app_user" user for client requests, rather than the "postgres" superuser (needed for RLS policies to work)
					settings["role"] = "app_user";

					SetUserFlags(req["user"]);
				}

				// make user-info accessible to Postgres sql-code, so RLS can function
				function SetUserFlags(user: User|n) {
					settings["app.current_user_id"] = user?.id ?? "[not signed in]"; // if user isn't signed-in, still set setting (else RLS errors)
					settings["app.current_user_basic"] = `${user?.permissionGroups.basic ?? false}`;
					settings["app.current_user_verified"] = `${user?.permissionGroups.verified ?? false}`;
					settings["app.current_user_mod"] = `${user?.permissionGroups.mod ?? false}`;
					settings["app.current_user_admin"] = `${user?.permissionGroups.admin ?? false}`;
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
AddWVCSchemas(AddSchema); // while we don't want to initialize the full web-vcore lib, we do want its vector schemas

app.get("/", (req, res)=>{
	res.send(`
		<p>This is the URL for the database server, which is not meant to be opened directly by your browser.</p>
		<p>Navigate to <a href="https://debatemap.app">debatemap.app</a> instead. (or <a href="http://localhost:3005">localhost:3005</a>/<a href="http://localhost:3055">localhost:3055</a>, if running Debate Map locally)</p>
	`.AsMultiline(0));
});

app.get("/test", (req, res)=>{
	res.send(`Placeholder response for /test route.`);
});
app.get("/app-server/test", (req, res)=>{
	res.send(`This shouldn't be received...`); // yet it is (better than not at all I guess)
});
// temp (obviously); as fallback for early-dev-version end-user fixing
app.get("/restart", (req, res)=>{
	res.send("Restarting app-server...");
	process.exit(42);
});

const serverPort = env.PORT || 3105 as number;
//if (inK8s) {}
app.listen(serverPort);
console.log("App-server started on:", serverPort);

/*const envVars_k8s = ["DB_VENDOR", "DB_ADDR", "DB_PORT", "DB_DATABASE", "DB_USER", "DB_PASSWORD", "PROXY_ADDRESS_FORWARDING"];
console.log("Env vars:", envVars_k8s.map(key=>`${key}: ${process.env[key]}`).join(", "));*/
//console.log("Env vars:", process.env);