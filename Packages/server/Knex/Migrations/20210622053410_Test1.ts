import {Knex} from "knex";

// doesn't work because this file's code runs *after* knex checks for the db's existence
/*async function CreateDBIfNotExists(name: string) {
	const config = require("../knexfile");
	let knex = new Knex.Client({
		client: "postgresql",
		connection: {
			...config.development.connection,
			//host: "localhost",
			database: null,
		},
	})
	 
	// Lets create our database if it does not exist
	await knex.raw("CREATE DATABASE IF NOT EXISTS ??", name)
}*/

export async function up(knex: Knex) {
	console.log("Starting");
	//CreateDBIfNotExists("debate-map");
	knex.schema.createTable("users_draft", t=>{
		t.text("id");
		t.text("displayName");
		t.text("photoURL");
		t.bigInteger("joinDate");
	});
}