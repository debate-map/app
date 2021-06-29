import "./Start_0.js";
import {program} from "commander";
import express from "express";
import {postgraphile, makePluginHook} from "postgraphile";
import {GeneratePatchesPlugin} from "@pg-lq/postgraphile-plugin";
import pg from "pg";
import {createRequire} from "module";
import {AuthenticationPlugin} from "./Mutations/Authentication.js";
import {SetUpAuthHandling} from "./AuthHandling.js";

//import "web-vcore/nm/js-vextensions_ApplyCETypes.ts";
import "web-vcore/nm/js-vextensions_ApplyCETypes.js";

type PoolClient = import("pg").PoolClient;
const {Pool} = pg;
const require = createRequire(import.meta.url);

//program.option("-v, --variant <type>", "Which server variant to use (base, patches)");

program.parse(process.argv);
export const launchOpts = program.opts();
export const variant = launchOpts.variant;

const app = express();

const dbURL = process.env.DATABASE_URL || `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@localhost:5432/debate-map`;
const dbPort = process.env.PORT || 3105 as number;

const pluginHook = makePluginHook([
	variant == "patches" && new GeneratePatchesPlugin(),
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
	)
);

SetUpAuthHandling(app);
// todo: MS server somehow confirms that the db-schema matches the "latest schema target" at startup (as derived from "Knex/Migrations/...")

app.listen(dbPort);
console.log("Server started.");