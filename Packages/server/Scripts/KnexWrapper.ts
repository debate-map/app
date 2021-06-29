import Knex from "knex";
import {up} from "./InitDB_Generated.js";
//import {seed} from "../Knex/Seeds/1_Main.js";
import seed from "../Knex/Seeds/1_Main";

import config from "../Knex/knexfile";
/*import {createRequire} from "module";
const require = createRequire(import.meta.url);
const config = require("../Knex/knexfile");*/

async function ConnectToDB_CreatingIfNonExistent(dbName: string) {
	// use knex object without db-name in connection-config at first, in case db doesn't exist yet
	let knex_early = Knex({
		...config.development,
		connection: {
			...config.development.connection,
			database: null,
		},
	});
	let dbExisted = (await knex_early.raw(`SELECT FROM pg_database WHERE datname = '${dbName}'`)).rows.length >= 1; // fsr, "rows" is empty if we use knex's var-substitution; so use string-concatenation
	if (!dbExisted) {
		console.log(`DB "${dbName}" not found. Creating now...`);
		await knex_early.raw("CREATE DATABASE ??", dbName);
		await knex_early.raw("ALTER DATABASE ?? SET search_path TO app_public, public;", dbName); // must do this in knex_early, else it doesn't apply for knex instance
	}
	await knex_early.destroy();

	// create new connection, inside the new database, so we can initialize some things
	const knex = Knex(config.development);
	if (!dbExisted) {
		await knex.raw("CREATE SCHEMA app_public");
	}

	return knex;
}

const command = process.argv[2];
if (command == "initDB") {
	InitDB();
} else if (command == "seedDB") {
	SeedDB();
} else if (command == "migrateDBToLatest") {
	MigrateDBToLatest();
}

// these were to try to fix the "try-finally gobbles unhandled errors" issue, but they didn't work
/*process.on("uncaughtException", err=>console.error(err));
process.on("unhandledRejection", err=>console.error(err));*/

async function InitDB() {
	const knex = await ConnectToDB_CreatingIfNonExistent("debate-map");

	const transaction = await knex.transaction();
	try {
		await up(transaction); // init db
		console.log("Seeding db...");
		await seed(transaction); // add seed data
		console.log("Committing transaction...");
		await transaction.commit();
	} catch(ex) {
		console.error(ex);
	} finally {
		await knex.destroy();
	}

	console.log(`InitDB function done.`);
	process.exit();
}
async function SeedDB() {
	const knex = await ConnectToDB_CreatingIfNonExistent("debate-map");

	const transaction = await knex.transaction();
	try {
		console.log("Seeding db...");
		await seed(transaction); // add seed data
		console.log("Committing transaction...");
		await transaction.commit();
	} catch(ex) {
		console.error(ex);
	} finally {
		await knex.destroy();
	}

	console.log(`SeedDB function done.`);
	process.exit();
}
async function MigrateDBToLatest() {
	const knex = await ConnectToDB_CreatingIfNonExistent("debate-map");

	await knex.migrate.latest();

	console.log(`Migration function done. (to rerun a migration, delete its row in the "knex_migrations" table; to rerun all, delete whole db)`);
	process.exit();
}