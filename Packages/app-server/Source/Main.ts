import "./Start_0.js"; // this must come first // eslint-disable-line
// should probably comment this out for now (not really using atm, partly due to forgotten issue hit with it earlier)
//import "./newrelic.js"; // import this next (it may need to come early) // eslint-disable-line
import "newrelic"; // import this next (it may need to come early) // eslint-disable-line

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
import {AddSchema, CreateCommandsPlugin, DBUpdate, GenerateUUID, GetAsync, GetSchemaJSON, mglClasses, schemaEntryJSONs, UserInfo} from "web-vcore/nm/mobx-graphlink.js";
import {Assert, FancyFormat, ToInt} from "web-vcore/nm/js-vextensions.js";
import {AddWVCSchemas} from "web-vcore/Dist/Utils/General/WVCSchemas.js";
import {GetUser, GetUserHiddensWithEmail, systemUserID, User} from "dm_common";
import fs from "fs";
import v8 from "v8";
//import SegfaultHandler from "segfault-raub";
import {IncomingMessage} from "http";
import {SetUpAuthHandling} from "./AuthHandling.js";
import {AuthExtrasPlugin, GetIPAddress} from "./Mutations/AuthenticationPlugin.js";
import {DBPreloadPlugin} from "./Mutations/DBPreloadPlugin.js";
import {CustomBuildHooksPlugin} from "./Plugins/CustomBuildHooksPlugin.js";
import {CustomInflectorPlugin} from "./Plugins/CustomInflectorPlugin.js";
import {InitApollo} from "./Utils/LibIntegrations/Apollo.js";
import {graph, InitGraphlink} from "./Utils/LibIntegrations/MobXGraphlink.js";
import {PostGraphileFulltextFilterPlugin} from "./Plugins/FullTextFilterPlugin.js";

/*const startTime = new Date().toLocaleString("sv");
setInterval(()=>console.log(`Still alive. @launch:${startTime} @now:${new Date().toLocaleString("sv")}`), 1000);*/
const exit_orig = process.exit;
process["exit" as any] = function(code) {
	console.log("TRYING TO EXIT WITH CODE:", code);
	return exit_orig.apply(this, arguments);
};

//import {OtherResolversPlugin} from "./Plugins/OtherResolversPlugin.js";

type PoolClient = import("pg").PoolClient;
const {Pool} = pg;
const require = createRequire(import.meta.url);

const rookout = require("rookout");
rookout.start({
	token: process.env.ROOKOUT_TOKEN,
	labels: {env: "dev"},
});

//require("@google-cloud/debug-agent").start({logLevel: 4});
/*require("lightrun").start({
	lightrunSecret: process.env.LIGHTRUN_SECRET,
	company: "societylibrary",
	includeNodeModules: true,
	level: 4,
});*/

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

// I found out (using "kubectl describe pod XXX") that segfaults were happening when trying to use chrome's inspector remotely, so added this (import of segfault-raub above)
/*SegfaultHandler["registerHandler"]("crash.log", (signal, address, stack)=>{
	console.log("Segfault occurred! @signal:", signal, "@address:", address, "@stack:", stack);
});*/
fs.writeFileSync("./segfault.log", "");
fs.writeFileSync(`StartedAt_${Date.now()}`, "");
//SegfaultHandler.causeSegfault(); // simulates a buggy native module that dereferences NULL

// second module, similar to segfault-raub
//require("ofe").call();
//require('ofe').trigger();

console.log("Test1:", require("child_process").execSync("sysctl vm.max_map_count").toString());

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

const liveSubscribeOps_timesSeen = new Map<string, number>();
const websocketRequestExtras = new WeakMap<Request, WebsocketRequestExtras>();
class WebsocketRequestExtras {
	liveSubscribeOps_timesSeen = new Map<string, number>();
}
export class LogSubscribeCalls_Hook {
	"postgraphile:liveSubscribe:executionResult"(result, {contextValue, operationName, variableValues}) {
		if (!websocketRequestExtras.has(contextValue.req)) websocketRequestExtras.set(contextValue.req, new WebsocketRequestExtras());
		const reqExtras = websocketRequestExtras.get(contextValue.req)!;

		const opKey = `@opName:${operationName} @vals:${JSON.stringify(variableValues)}`;
		const timesSeen = (liveSubscribeOps_timesSeen.get(opKey) ?? 0) + 1;
		const timesSeen_req = (reqExtras.liveSubscribeOps_timesSeen.get(opKey) ?? 0) + 1;
		// only show entries with variables present atm, since otherwise we can't tell between duplicates and just connection-filter-filtered ones
		if (Object.keys(variableValues).length > 0) {
			const wsReqs = reqExtras.liveSubscribeOps_timesSeen;
			console.log(`Got liveSubscribe exec-result. @reqCalls:(ws:${timesSeen_req},all:${timesSeen}) @wsReqs:(types:${[...wsReqs.keys()].length},calls:${[...wsReqs.values()].Sum()}) @ip:${GetIPAddress(contextValue.req)
				} ${opKey}`);
		}
		liveSubscribeOps_timesSeen.set(opKey, timesSeen);
		reqExtras.liveSubscribeOps_timesSeen.set(opKey, timesSeen_req);

		return result;
	}
}
const pluginHook = makePluginHook([
	// todo: turn this variant on, and add the client-side plugin, for more efficient list-change messages
	variant == "patches" && new GeneratePatchesPlugin(),
	new LogSubscribeCalls_Hook(),
] as any[]);

export const pgPool = new Pool({
	connectionString: dbURL,
	max: 30,
});
/*const query_orig = pgPool.query;
pgPool.query = function(str) {
	const queryAsStr = typeof str == "string" ? str : JSON.stringify(str);
	if (queryAsStr != "commit" && queryAsStr != "begin") console.log("pgPool.query @length:", queryAsStr.length, "@start:", queryAsStr);
	return query_orig.apply(this, arguments);
};*/

graph.subs.pgPool = pgPool;
//export var pgClient: PoolClient;
pgPool.on("connect", client=>{
	console.log(`A pgClient has been created in the pool. New pool size:`, pgPool.totalCount);

	/*const query_orig2 = client.query;
	client.query = function(str) {
		const queryAsStr = typeof str == "string" ? str : JSON.stringify(str);
		if (queryAsStr != "commit" && queryAsStr != "begin") console.log("client.query @length:", queryAsStr.length, "@start:", queryAsStr);
		return query_orig2.apply(this, arguments);
	};*/

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
/*pgPool.on("acquire", client=>{
	console.log("PGPool acquired.");
});*/
pgPool.on("error", err=>{
	console.log("PGPool error:", err);
});

app.get("/health-check", async(req, res)=>{
	const checkStart = Date.now();
	const TimeSinceCheckStart = ()=>`${((Date.now() - checkStart) / 1000).toFixed(1)}s`;

	console.log("Starting health-check. @time:", new Date().toLocaleString("sv"));
	try {
		Assert(pgPool.totalCount > 0, "No pgClient has been initialized/connected within the pool yet.");

		const usersCountData = await pgPool.query("SELECT count(*) FROM (SELECT 1 FROM users LIMIT 10) t;");
		const usersCount = ToInt(usersCountData.rows[0].count);
		Assert(usersCount >= 1, "Could not find any users in database. (at least the system user should exist)");
		console.log(`Health-check: Passed 1 (time: ${TimeSinceCheckStart()}) [user count: ${usersCount}]`);

		// disabled this for now, because I think it is the (main) reason for the progressively slower reacting to certain database changes (eg. after adding node);
		//		suspected reason: these GetAsync() calls are probably creating "ghost subscriptions" of some sort, overloading the subscription plugin with trying to send updates to lots of no-longer-present subscribers;
		//		I could try to use the WeakRef counting trick to confirm if this is the case, but I'd rather just proceed with a wider rewrite
		//const existingUser_hidden = await Timeout_5s(1, GetAsync)(()=>GetUserHiddensWithEmail("debatemap@gmail.com")[0], {errorHandling_final: "log"});
		/*const existingUser_hidden = await GetAsync(()=>GetUserHiddensWithEmail("debatemap@gmail.com")[0], {errorHandling_final: "log"});
		console.log(`Health-check: Passed 2 (time: ${TimeSinceCheckStart()})`);
		Assert(existingUser_hidden != null, "Could not find system-user's user-hidden data, which we know should exist.");
		console.log(`Health-check: Passed 3 (time: ${TimeSinceCheckStart()})`);*/

		console.log(`Health-check: Good. (time: ${TimeSinceCheckStart()})`);
		res.sendStatus(200); // status: 200 OK
	} catch (ex) {
		console.log(`Health-check: Bad. (time: ${TimeSinceCheckStart()}) Error:`, ex);
		res.sendStatus(500); // status: 500 Internal Server Error
		// try to reconnect the pool
		pgPool.connect();
	}
});
app.get("/db-user-count", async(req, res)=>{
	const checkStart = Date.now();
	const TimeSinceCheckStart = ()=>`${((Date.now() - checkStart) / 1000).toFixed(1)}s`;

	console.log("Starting user-count check.");
	Assert(pgPool.totalCount > 0, "No pgClient has been initialized/connected within the pool yet.");

	const usersCountData = await pgPool.query("SELECT count(*) FROM (SELECT 1 FROM users LIMIT 10) t;");
	const usersCount = ToInt(usersCountData.rows[0].count);
	console.log(`User-count: ${usersCount} @time:${TimeSinceCheckStart()}`);

	res.send(`User-count logged on app-server.`);
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

const userBlockMiddleware = (req, res, next)=>{
	// uncomment this if you want to restrict the users that can connect to postgraphile (eg. only you, while testing something)
	/*const ip = GetIPAddress(req);
	console.log("Got request. @ip:", ip, "@user:", req["user"]);
	const ipStr = ip.toString();
	const allowConditions = [
		a=>a == "::ffff:127.0.0.1",
		a=>a.startsWith(process.env.PGLRequiredIPStart ?? "n/a"),
	] as ((str: string)=>boolean)[];
	if (!allowConditions.Any(a=>a(ipStr))) {
		//res.status(403).end("Temporarily blocked for maintenance.");
		console.log("Blocking connection.");
		return;
	}
	console.log("Proceeding:", ip);*/

	next();
};

app.use(
	userBlockMiddleware,
	postgraphile(
		pgPool,
		"app_public",
		{
			websocketMiddlewares: [
				// add WS middlewares here; note that they should only manipulate properties on req/res, they must not sent response data (v: I tried to, and it seemed to overload chrome's WS limit or something, making other tabs stop receiving WS data)
				userBlockMiddleware,
			],
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

					preCommandRun: async info=>{
						const req = info.context.req;
						// if request has no user authenticated, but this request is from an internal pod (as proven by SecretForRunAsSystem header), treat it as being authed as the system-user (temp)
						const secretForRunAsSystem = req.headers["SecretForRunAsSystem".toLowerCase()]; // header-names are normalized to lowercase by postgraphile apparently
						if (req.user == null && process.env.DB_PASSWORD != null && secretForRunAsSystem == process.env.DB_PASSWORD) {
							const systemUser = await GetAsync(()=>GetUser(systemUserID));
							info.context.req = {...req, user: systemUser} as any;
							// we must also update this field afterward (since it's derivative)
							info.command._userInfo_override = systemUser;
						}

						//console.log("User in command resolver:", info.context.req.user?.id);
						Assert(info.context.req.user != null, "Cannot run command on server unless logged in.");
						console.log(`Preparing to run command "${info.command.constructor.name}". @args:`, info.args, "@userID:", info.context.req.user.id);
						serverWS_currentCommandUser = info.context.req.user;
					},
					postCommandRun: async info=>{
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
								`\n@DBUpdates:\n${(info["dbUpdates"] as DBUpdate[] ?? []).map(a=>`\t${a.path} -> set to -> ${JSON.stringify(a.value)}`).join("\n") || "none (eg. error during Validate function)"}`,
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
			pgSettings: (req: IncomingMessage)=>{
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
		<p>Navigate to <a href="https://debatemap.app">debatemap.app</a> instead. (or <a href="http://localhost:5100">localhost:5100</a>/<a href="http://localhost:5101">localhost:5101</a>, if running Debate Map locally)</p>
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

// temp; perf debugging
app.get("/dump-mem", async(req, res)=>{
	console.log("Starting memory dump...");
	const dumpPath = `${new Date().toLocaleString("sv").replace(/[ :]/g, "-")}.heapsnapshot`;
	await fs.promises.writeFile(dumpPath, v8.getHeapSnapshot());
	console.log("Memory dump saved to:", dumpPath);
	res.send(`Memory dump saved.`);
});
function GetMemInfo() {
	const result = v8.getHeapStatistics();
	for (const [key, value] of Object.entries(process.memoryUsage())) {
		result[`extra_${key}`] = value;
	}
	return result;
}
app.get("/check-mem", async(req, res)=>{
	console.log("@memInfo:", GetMemInfo());
	res.send(`Memory info logged on app-server.`);
});
// test; allocate memory, to test behavior (from: https://developer.ibm.com/articles/nodejs-memory-management-in-container-environments)
// Currently this fails after: A) 1 buffer creation, in local Docker Desktop, with WSL mem-limit at 6gb, B) 4 buffer creations, in OVH 8gb cluster
// (and both numbers remain unchanged when changing the max-old-space-size from the default 2gb to 8gb, suggesting the old [2gb] MOSS value was already set to/near the max of what the nodes currently support)
/*console.log("MemInfo_BeforeBufferAllocate:", GetMemInfo());
const bufs = [] as any[];
globalThis.bufs = bufs;
const digits = "0123456789".split("");
for (let i = 0; i < 20; i++) {
	const mbPerStep = 1000;

	//const buf = Buffer.alloc(mbPerBuffer * 1024 * 1024, "x");
	// use string rather than Buffer (since string always goes on heap, rather than native/external space)
	// create multiple strings (each 1MB large) to complete this "step" (since NodeJS has limit on string length)
	for (let i2 = 0; i2 < mbPerStep; i2++) {
		let str_1mb = "";
		const bytesPerMB = 1024 * 1024;
		while (str_1mb.length < bytesPerMB) {
			str_1mb += digits.Random().repeat(256);
		}
		bufs.push(str_1mb);
	}

	console.log("Buffers created:", i + 1, ` @totalSize_mb:~${mbPerStep * (i + 1)}`); // mb size approximate, since a small % of random-strings may be the same, and thus be merged by v8
}*/

const serverPort = env.PORT || 5115 as number;
//if (inK8s) {}
app.listen(serverPort);
console.log("App-server started on:", serverPort, "@memInfo:", GetMemInfo());

/*const envVars_k8s = ["DB_VENDOR", "DB_ADDR", "DB_PORT", "DB_DATABASE", "DB_USER", "DB_PASSWORD", "PROXY_ADDRESS_FORWARDING"];
console.log("Env vars:", envVars_k8s.map(key=>`${key}: ${process.env[key]}`).join(", "));*/
//console.log("Env vars:", process.env);
