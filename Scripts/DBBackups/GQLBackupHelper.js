const fs = require("fs");
//const fetch = require("node-fetch");
const child_process = require("child_process");
const paths = require("path");

require("dotenv").config({path: `${__dirname}/../../.env`});

function GetInvalidJWTErrorMessage(jwtTokenEnvVarName, jwtMissing) {
	const reasonMessage = jwtMissing
		? `No jwt-token was provided. (neither as command-line arg, nor as environment variable, eg. in .env file in repo-root)`
		: `A jwt-token was provided, but it was rejected by the server (probably just outdated).`;
	return `
		${reasonMessage}
		You can provide a valid jwt either through a ".env" file in repo-root (see ".env.template" file for expected format), or by passing it directly as the \`--jwt "..."\` argument.
		As for retrieving the jwt-token in the first place, you can either:
		1) Go to https://debatemap.app/app-server/gql-playground (or dev/localhost equivalent), and use the "signInStart" endpoint.
		2) Sign in on "debatemap.app" website (or dev/localhost equivalent), open dev-tools, and copy your JWT from the Application->LocalStorage panel. (these expire ~4 weeks after sign-in time)
	`.trim();
}

const program = require("commander");
program
	.command("backup").description(`Calls the graphql "getDBDump" endpoint, and saves the result to a file. (the file is saved to the folder specified by --backupFolder)`)
	.option("--dev", `If specified, then "localhost:5110" is used as the gql endpoint, and "DM_USER_JWT_DEV" is the env-var read, and the default backup-folder is "../Others/@Backups/DBDumps_local/" (is overriden by --backupFolder).`)
	.option("--jwt <>", `If specified, uses the jwt here rather than getting it from an env-var. (useful for testing)`)
	.option("--backupFolder <>", `Path to folder where the db dump/backup should be placed. (path is relative to repo root, which is "<this-folder>/../../")`)
	.action(async command=>{
		const {dev, jwt, backupFolder} = command;
		//console.log("Flags:", {dev, jwt, backupFolder});
		const backupFolder_final_relToRepoRoot = backupFolder ?? `../Others/@Backups/DBDumps_${dev ? "local" : "ovh"}/`;

		const fetch = (await import("node-fetch")).default;
		try {
			const origin = dev ? "http://localhost:5100/app-server" : "https://debatemap.app/app-server";

			const jwtTokenEnvVarName = `DM_USER_JWT${dev ? `_DEV` : "_PROD"}`;
			const jwtToken = jwt ?? process.env[jwtTokenEnvVarName];
			if (jwtToken == null) {
				console.error(GetInvalidJWTErrorMessage(jwtTokenEnvVarName, true));
				return void WaitForEnterKeyThenExit(1);
			}

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
				return void WaitForEnterKeyThenExit(1);
			}
			if (response_structure.errors) {
				console.error("Got graphql/server errors:", response_structure.errors);
				if (response_structure.errors.find(a=>a.message.includes("Authentication tag didn't verify"))) {
					console.error("Extra note: " + GetInvalidJWTErrorMessage(jwtTokenEnvVarName, false));
				}
				return void WaitForEnterKeyThenExit(1);
			}
			const pgdumpSqlStr = response_structure.data.getDBDump.pgdumpSql;

			const CurrentTime_SafeStr = ()=>new Date().toLocaleString("sv").replace(/[ :]/g, "-"); // ex: 2021-12-10-09-18-52
			const folderPathAbsolute = paths.resolve(`${__dirname}/../../${backupFolder_final_relToRepoRoot}`);
			const filePath = paths.join(`${folderPathAbsolute}/${CurrentTime_SafeStr()}.sql`); // normalize slashes
			fs.writeFileSync(filePath, pgdumpSqlStr);
			console.log(`Database backup saved to file:`, filePath);

			// open file explorer (cross platform) to path above:
			if (process.platform === "win32") {
				child_process.exec(`start "" "${folderPathAbsolute}"`);
			} else {
				child_process.exec(`open "${folderPathAbsolute}"`);
			}

			return void WaitForEnterKeyThenExit(0);
		} catch (ex) {
			console.error("Got error during execution:", ex);
			return void WaitForEnterKeyThenExit(1);
		}
	});

// error on unknown commands
program.on("command:*", ()=>{
	console.error("Invalid command: %s\nSee --help for a list of available commands.", program.args.join(" "));
	process.exit(1);
});

program.parse(process.argv);

function WaitForEnterKeyThenExit(code) {
	console.log("Press any key to exit...");
	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.on("data", ()=>process.exit(code));
}