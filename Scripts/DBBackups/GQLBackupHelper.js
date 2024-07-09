const fs = require("fs");
//const fetch = require("node-fetch");
const child_process = require("child_process");
const {chain} = require("stream-chain");
const {parser} = require("stream-json");
const {pick} = require("stream-json/filters/Pick");
const {streamValues} = require("stream-json/streamers/StreamValues");
const {disassembler} = require("stream-json/Disassembler");
const {stringer} = require("stream-json/Stringer");
const paths = require("path");
const ora = require("ora-classic");

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

		const dir = paths.dirname(__filename);

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

			const spinner = ora("Fetching DB dump...").start();

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

			spinner.succeed("Fetched DB dump.");

			if (!pgdump_sql_response.ok) {
				const errorString = `Got graphql/server errors:${response_structure.errors}`;
				spinner.fail(errorString);

				if (response_structure.errors.find(a=>a.message.includes("Authentication tag didn't verify"))) {
					console.error(`\n\nExtra note: ${GetInvalidJWTErrorMessage(jwtTokenEnvVarName, false)}`);
				}
				return void WaitForEnterKeyThenExit(1);
			}
			const CurrentTime_SafeStr = ()=>new Date().toLocaleString("sv").replace(/[ :]/g, "-"); // ex: 2021-12-10-09-18-52
			const folderPathAbsolute = paths.resolve(`${__dirname}/../${backupFolder_final_relToRepoRoot}`);
			const filePath = paths.join(`${folderPathAbsolute}/${CurrentTime_SafeStr()}.sql`); // normalize slashes
			const fileStream = fs.createWriteStream(filePath);

			const saveSpinner = ora("Saving DB dump to file...").start();

			const pipeline = chain([
				pgdump_sql_response.body,
				parser({
					packStrings: false,
					streamStrings: true,
				}),
				pick({filter: "data.getDBDump.pgdumpSql"}),
				data=>data.value,
			]);

			const streamPromise = new Promise((resolve, reject)=>{
				pipeline.on("data", val=>{
					fileStream.write(val);
				});

				pipeline.on("end", ()=>{
					fileStream.close(()=>{
						resolve();

					});
				});
				pipeline.on("error", reject);
			});

			await streamPromise;

			const successText = `Database backup saved to file: ${filePath}`;
			saveSpinner.succeed(successText);

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