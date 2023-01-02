const fs = require("fs");
const fetch = require("node-fetch");

const extraArgsStr = process.argv[2];
const dev = extraArgsStr == "dev";
const origin = dev ? "http://localhost:5110" : "https://app-server.debates.app";
console.log("Origin:", origin);

Start();
async function Start() {
	const pgdump_sql_response = await fetch(`${origin}/graphql`, {
		method: "POST",
		body: JSON.stringify({
			operationName: null,
			query: `query { getDBDump { pgdumpSql } }`,
			variables: {},
		}),
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			authorization: `Bearer ${process.env[`DM_JWT_TOKEN${dev ? `_DEV` : "_PROD"}`]}`,
		},
	});
	console.log(process.env[`DM_JWT_TOKEN${dev ? `_DEV` : "_PROD"}`]);
	const response_structure_str = await pgdump_sql_response.text();
	console.log("Got response-structure-string:", response_structure_str);

	let response_structure;
	try {
		response_structure = JSON.parse(response_structure_str);
	} catch (ex) {
		console.error("Got error parsing response-structure as json. Response-structure-string:", response_structure_str);
		process.exit(1);
	}
	const pgdump_sql_str = response_structure.data.getDBDump.pgdumpSql;

	const CurrentTime_SafeStr = ()=>new Date().toLocaleString("sv").replace(/[ :]/g, "-"); // ex: 2021-12-10-09-18-52
	const folder_path_absolute = `${__dirname}/../../../Others/@Backups/DBDumps_${dev ? "local" : "ovh"}/`;
	fs.writeFileSync(`${folder_path_absolute}/${CurrentTime_SafeStr()}.sql`, pgdump_sql_str);
}