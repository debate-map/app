import "./Start_0";

import commander from "commander";
const {program} = commander;
import express from "express";
import postgraphile_ from "postgraphile";
const postgraphile = postgraphile_["postgraphile"] as typeof import("postgraphile").postgraphile;
const makePluginHook = postgraphile_["makePluginHook"] as typeof import("postgraphile").makePluginHook;
import {GeneratePatchesPlugin} from "@pg-lq/postgraphile-plugin";
import {Pool, PoolClient} from "pg";

import {createRequire} from "module";
import {AuthenticationPlugin} from "./Mutations/Authentication";
import {SetUpAuthHandling} from "./AuthHandling";
const require = createRequire(import.meta.url);

//program.option("-v, --variant <type>", "Which server variant to use (base, patches)");

program.parse(process.argv);
export const launchOpts = program.opts();
export const variant = launchOpts.variant;

const app = express();

const dbURL = process.env.DATABASE_URL || `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@localhost:5432/game-dive`;
const dbPort = process.env.PORT || 3105 as number;

const pluginHook = makePluginHook([
	variant == "patches" && GeneratePatchesPlugin,
]);

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
				require("@graphile-contrib/pg-simplify-inflector"),
				require("@graphile/subscriptions-lds").default,
				require("postgraphile-plugin-connection-filter"),
				AuthenticationPlugin,
			],
			dynamicJson: true,
			live: true,
			ownerConnectionString: dbURL, // passed in a 2nd time, for live-query module (connection-string with elevated privileges)
			enableCors: true, // cors flag temporary; enables mutations, from any origin
			showErrorStack: true,
			extendedErrors: ["hint", "detail", "errcode"], // to show error text in console (doesn't seem to be working)
		},
	)
);

SetUpAuthHandling(app);

app.listen(dbPort);
console.log("Server started.");