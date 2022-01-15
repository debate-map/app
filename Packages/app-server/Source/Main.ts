import "./Start_0.js"; // this must come first // eslint-disable-line
//import "./newrelic.js"; // import this next (it may need to come early) // eslint-disable-line
import "newrelic"; // import this next (it may need to come early) // eslint-disable-line

import {program} from "commander";
import cors from "cors";
import express from "express";
import pg from "pg";
import {makePluginHook, postgraphile} from "postgraphile";
//import "web-vcore/nm/js-vextensions_ApplyCETypes.ts";
import "web-vcore/nm/js-vextensions_ApplyCETypes.js";
import fetch from "node-fetch";
import cookieParser from "cookie-parser";
import {graph, InitGraphlink} from "./Utils/LibIntegrations/MobXGraphlink.js";

type PoolClient = import("pg").PoolClient;
const {Pool} = pg;

program.parse(process.argv);
export const launchOpts = program.opts();
export const variant = launchOpts.variant;

if (!globalThis.fetch) {
	globalThis.fetch = fetch;
}

const app = express();
export const serverLaunchID = "hi"; // token used to identify the server-to-server websocket

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

pg.defaults.poolSize = 1;
export const pgPool = new Pool({
	connectionString: dbURL,
});
graph.subs.pgPool = pgPool;

postgraphile(
	pgPool,
	"app_public",
	{
		ownerConnectionString: dbURL, // passed in a 2nd time, for live-query module (connection-string with elevated privileges)
		disableDefaultMutations: true, // we use custom mutations for everything, letting us use TypeScript+MobXGraphlink for all validations
	},
);

const startTime = new Date().toLocaleString("sv");
setInterval(()=>console.log(`Still alive. @launch:${startTime} @now:${new Date().toLocaleString("sv")}`), 1000);