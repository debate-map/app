require("dotenv").config({path: "../../.env"});

/*import dotenv from "dotenv";
dotenv.config({path: "../../.env"});
import {dirname} from "path";
import {fileURLToPath} from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));*/

//console.log("dirname", __dirname);

module.exports = {
//export default {
	development: {
		client: "postgresql",
		connection: {
			database: "debate-map",
			user: process.env.LOCALDB_USERNAME,
			password: process.env.LOCALDB_PASSWORD,
		},
		pool: {
			min: 2,
			max: 10,
		},
		migrations: {
			schemaName: "public",
			tableName: "knex_migrations",
			//directory: "./Knex/Migrations", // paths are relative to "Packages/server"
			directory: `${__dirname}/Migrations`,
		},
		//acquireConnectionTimeout: 3000,
	},
	/*production: {
		client: "postgresql",
		connection: {
			database: "debate-map",
			user: process.env.LOCALDB_USERNAME,
			password: process.env.LOCALDB_PASSWORD,
		},
		pool: {
			min: 2,
			max: 10,
		},
		migrations: {
			tableName: "knex_migrations",
		}
	},*/
};