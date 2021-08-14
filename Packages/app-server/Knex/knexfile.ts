
import dotenv from "dotenv";
dotenv.config({path: "../../.env"});
import {dirname} from "path";
import {fileURLToPath} from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

const env = process.env;
console.log("DB_Addr:", Object.entries(env).filter(a=>a[0].includes("DB_")));
export default {
	development: {
		client: "postgresql",
		//connection: "postgresql://debate-map:...@localhost:8081/debate-map",
		connection: {
			host: env.DB_ADDR ?? "127.0.0.1",
			port: env.DB_PORT ?? 5432,
			database: env.DB_DATABASE ?? "debate-map",
			user: env.DB_USER ?? env.LOCALDB_USERNAME,
			password: env.DB_PASSWORD ?? env.LOCALDB_PASSWORD,
			ssl: true,
		},
		pool: {
			min: 2,
			max: 10,
		},
		migrations: {
			schemaName: "public",
			tableName: "knex_migrations",
			//directory: "./Knex/Migrations", // paths are relative to "Packages/app-server"
			directory: `${__dirname}/Migrations`,
		},
		seeds: {
			directory: `${__dirname}/Seeds`,
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