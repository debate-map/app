require("dotenv").config({path: "../../.env"});

module.exports = {
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
			tableName: "knex_migrations",
			directory: "./Migrations",
		},
		acquireConnectionTimeout: 3000,
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