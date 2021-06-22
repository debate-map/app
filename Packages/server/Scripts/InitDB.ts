import Knex from "knex";
//import config from "../Knex/knexfile";
import {createRequire} from "module";
const require = createRequire(import.meta.url);

const dbName = "debate-map";

const config = require("../Knex/knexfile");
async function CreateDBIfNotExists(name: string) {
	console.log("Test1:");
	/*let knex = new Knex.Client({
		//client: "postgresql",
		client: "pg",
		//connection: `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@localhost:5432/debate-map`,
		//connection: `postgres://${config.development.connection.user}:${config.development.connection.password}@localhost:5432/debate-map`,
		//connection: `postgres://${config.development.connection.user}:${config.development.connection.password}@localhost:5432`,
		connection: {
			...config.development.connection,
			//host: "localhost", port: 5432,
    		host: "127.0.0.1", //port: 5432,
			 //host: "localhost:5432",
			database: null,
		},
	});*/
	const config_final = JSON.parse(JSON.stringify(config.development));
	delete config_final.connection.database;
	let knex = new Knex.Client(config_final);

	console.log("Creating");
	await knex.raw("CREATE DATABASE IF NOT EXISTS ??", name);
	console.log("Created");
}

async function Main() {
	await CreateDBIfNotExists(dbName);
	console.log("Created2");

	// now that our database confirmed to exist, create another knex object (with db-name specified) so we can run our migrations
	const knex = new Knex.Client({
		//client: "postgresql",
		client: "pg",
		connection: {
			...config.development.connection,
			//host: "localhost",
			database: dbName,
		},
	});

	await knex["migrate"].latest();
}

Main().catch(console.log).then(()=>process.exit());