// we need the migration scripts to be commonjs, because knexjs imports/calls them dynamically, using "require(...)"
//import {Knex} from "knex";
//const {Knex} = require("knex");
//import {Knex} = require("knex");
//type Knex = import("knex").Knex;

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

//export async function up(knex: Knex) {
module.exports.up = async(knex: Knex)=>{
	console.log("Starting");
	//CreateDBIfNotExists("debate-map");
	await knex.schema.createTable("users_draft", t=>{
		t.text("id");
		t.text("displayName");
		t.text("photoURL");
		t.bigInteger("joinDate");
	});
	console.log("Done");
};
module.exports.down = ()=>{
	throw new Error("Not implemented.");
};