import Knex from "knex";

//import config from "../Knex/knexfile";
import {createRequire} from "module";
const require = createRequire(import.meta.url);
const config = require("../Knex/knexfile");

async function CreateDBIfNotExists(dbName: string) {
	let knex = Knex({
		//client: "postgresql",
		client: "pg",
		//connection: `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@localhost:5432/debate-map`,
		//connection: `postgres://${config.development.connection.user}:${config.development.connection.password}@localhost:5432/debate-map`,
		//connection: `postgres://${config.development.connection.user}:${config.development.connection.password}@localhost:5432`,
		connection: {
			...config.development.connection,
			//host: "localhost", port: 5432,
    		//host: "127.0.0.1", //port: 5432,
			//host: "localhost:5432",
			database: null,
		},
	});
	/*const config_final = JSON.parse(JSON.stringify(config.development));
	delete config_final.connection.database;
	let knex = Knex(config_final);
	//let knex = new Knex.Client(config_final);
	//knex.initializePool();*/

	//await knex.raw("CREATE DATABASE ??", name);
	//await knex.raw("CREATE DATABASE IF NOT EXISTS ??", [name]);
	//await knex.raw("SELECT 'CREATE DATABASE ??' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '??')\\gexec", [name, name]);
	//let result = await knex.raw("SELECT 'CREATE DATABASE ??' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '??')", [name, name]);
	//let dbExists = (await knex.raw("SELECT 1 FROM pg_database WHERE datname = '??'", name)).rows.length >= 1;
	let dbExists = (await knex.raw(`SELECT FROM pg_database WHERE datname = '${dbName}'`)).rows.length >= 1; // fsr, "rows" is empty if we use knex's var-substitution; so use string-concatenation
	if (!dbExists) {
		console.log(`DB "${dbName}" not found. Creating now...`);
		await knex.raw("CREATE DATABASE ??", dbName);
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