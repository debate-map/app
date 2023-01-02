const fs = require("fs");
const fetch = require("node-fetch");
const child_process = require("child_process");
	const paths = require("path");

const extraArgsStr = process.argv[2];
const dev = extraArgsStr == "dev";
const origin = dev ? "http://localhost:5110" : "https://app-server.debates.app";
//console.log("Origin:", origin);

require("dotenv").config({path: `${__dirname}/../../.env`});
const jwtTokenEnvVarName = `DM_USER_JWT${dev ? `_DEV` : "_PROD"}`;
const jwtToken = process.env[jwtTokenEnvVarName];
if (jwtToken == null) {
	throw new Error(`
No environment-variable named "${jwtTokenEnvVarName}" found! The recommended way to provide it is through a ".env" file in repo-root; see ".env.template" file for expected format.
As for retrieving the jwt-token in the first place, you can either:
1) Go to https://app-server.debates.app/gql-playground (or dev/localhost equivalent), and use the "signInStart" endpoint.
2) Sign in on "debates.app" website (or dev/localhost equivalent), open dev-tools, and copy your JWT from the Application->LocalStorage panel. (these expire ~4 weeks after sign-in time)
	`.trim());
}

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
			authorization: `Bearer ${jwtToken}`,
		},
	});
	const response_structure_str = await pgdump_sql_response.text();
	//console.log(`Got response-structure-string:\n==========\n${response_structure_str}\n==========`);

	let response_structure;
	try {
		response_structure = JSON.parse(response_structure_str);
	} catch (ex) {
		console.error("Got error parsing response-structure as json. Response-structure-string:", response_structure_str);
		process.exit(1);
	}
	const pgdump_sql_str = response_structure.data.getDBDump.pgdumpSql;

	const CurrentTime_SafeStr = ()=>new Date().toLocaleString("sv").replace(/[ :]/g, "-"); // ex: 2021-12-10-09-18-52
	const folder_path_absolute = paths.resolve(`${__dirname}/../../../Others/@Backups/DBDumps_${dev ? "local" : "ovh"}/`);
	fs.writeFileSync(`${folder_path_absolute}/${CurrentTime_SafeStr()}.sql`, pgdump_sql_str);

	// open file explorer (cross platform) to path above:
	if (process.platform === "win32") {
		child_process.exec(`start "" "${folder_path_absolute}"`);
	} else {
		child_process.exec(`open "${folder_path_absolute}"`);
	}
}