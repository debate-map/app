import Knex from "knex";

//import config from "../Knex/knexfile";
import {createRequire} from "module";
const require = createRequire(import.meta.url);
const config = require("../Knex/knexfile");

async function CreateDBIfNotExists(dbName: string) {
	let knex_early = Knex({
		...config.development,
		connection: {
			...config.development.connection,
			database: null,
		},
	});
	let dbExists = (await knex_early.raw(`SELECT FROM pg_database WHERE datname = '${dbName}'`)).rows.length >= 1; // fsr, "rows" is empty if we use knex's var-substitution; so use string-concatenation
	if (!dbExists) {
		console.log(`DB "${dbName}" not found. Creating now...`);
		await knex_early.raw("CREATE DATABASE ??", dbName);

		// create new connection, inside the new database, so we can initialize some things
		const knex = Knex(config.development);
		await knex.raw("CREATE SCHEMA app_public");
		await knex.raw("ALTER DATABASE ?? SET search_path TO app_public, public;", dbName);
	}
}

async function Main() {
	await CreateDBIfNotExists("debate-map");

	// now that our database confirmed to exist, create another knex object (with db-name specified) so we can run our migrations
	//const knex = new Knex.Client({
	const knex = Knex(config.development);

	await knex.migrate.latest();
}

Main().catch(console.error).then(()=>{
	console.log(`InitDB script done. (to rerun a migration, delete its row in the "knex_migrations" table; to rerun all, delete whole db)`);
	process.exit();
});
//Main();