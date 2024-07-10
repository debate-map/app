const fs = require("fs");
//const fetch = require("node-fetch");
const child_process = require("child_process");
const {chain} = require("stream-chain");
const {parser} = require("stream-json");
const {pick} = require("stream-json/filters/Pick");
const cloneable = require('cloneable-readable')
const paths = require("path");
const ora = require("ora-classic");

require("dotenv").config({path: `${__dirname}/../../.env`});

function GetInvalidJWTErrorMessage(jwtTokenEnvVarName, jwtMissing) {
	const reasonMessage = jwtMissing
		? `No jwt-token was provided. (neither as command-line arg, nor as environment variable)`
		: `A jwt-token was provided, but it was rejected by the server. (probably just outdated)`;
	return `
		${reasonMessage}
		You can provide a valid jwt either through a "${jwtTokenEnvVarName}" environment variable (eg. within ".env" file in repo-root; see ".env.template"), or by passing it directly as the \`--jwt "..."\` argument.
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
		let fetchSpinner;
		let saveSpinner;

		try {
			const startTime = Date.now();
			const origin = dev ? "http://localhost:5100/app-server" : "https://debatemap.app/app-server";

			const jwtTokenEnvVarName = `DM_USER_JWT${dev ? `_DEV` : "_PROD"}`;
			const jwtToken = jwt ?? process.env[jwtTokenEnvVarName];
			if (jwtToken == null) {
				console.error(GetInvalidJWTErrorMessage(jwtTokenEnvVarName, true));
				return void WaitForEnterKeyThenExit(1);
			}

			fetchSpinner = ora("Performing DB dump...").start();

			// Note: When testing this backup process locally, it can get stuck at this "fetch call" step (port-forwarder seems to get overwhelmed).
			// If this happens, try using the "forward_[local/ovh]" script for the port-forwards rather than Tilt's port-forwarder, so you can quickly restart it when this happens.
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
			if (!pgdump_sql_response.ok) {
				// if pgdump failed, the response should be short enough to not require streaming, so just read it all at once
				const responseAsStr = await pgdump_sql_response.body.read();
				const errorString = `Got http/server errors:${responseAsStr}`;
				fetchSpinner.fail(errorString);
				return void WaitForEnterKeyThenExit(1);
			}
			fetchSpinner.succeed("DB dump created on server.");

			//const pgdumpResponseBody = pgdump_sql_response.body;
			const pgdumpResponseBody = cloneable(pgdump_sql_response.body);
			const pgdumpResponseBody_clone = pgdumpResponseBody.clone();
			// read the first 1-million chars of the stream clone, to check for errors (read it using "pipe")
			let firstMillionChars = "";
			// when we call `.on("data", ...)`, it seems to have the same effect as `.pipe(...)`, in that it triggers the cloneable-readable stream to start its splitting/cloning process
			pgdumpResponseBody_clone.on("data", chunk=>{
				// if string already large enough to handle any error-containing response, stop appending to our string buffer (else we'll hit the NodeJS string-length limit)
				if (firstMillionChars.length >= 1_000_000) return;
				firstMillionChars += chunk;
			});

			const CurrentTime_SafeStr = ()=>new Date().toLocaleString("sv").replace(/[ :]/g, "-"); // ex: 2021-12-10-09-18-52
			const folderPathAbsolute = paths.resolve(`${__dirname}/../../${backupFolder_final_relToRepoRoot}`);
			const filePath = paths.join(`${folderPathAbsolute}/${CurrentTime_SafeStr()}.sql`); // normalize slashes

			const saveSpinner = ora("Saving DB dump to file...").start();

			let writeIssue = await WriteStreamContentsToFileStream(pgdumpResponseBody, filePath);
			if (writeIssue != null) {
				// for write issue of contents simply being empty, check for graphql/server errors in the response instead
				// (this error-processing route will error if run on a stream that has the full dbdump contents present, due to it not using streaming of the contents)
				if (writeIssue == pgdumpContentsNotFoundMessage) {
					const errors = JSON.parse(firstMillionChars)?.errors;
					if (errors?.length) {
						saveSpinner.fail(`Got graphql/server errors: ${JSON.stringify(errors)}`);
						if (errors.find(a=>a.message.includes("Authentication tag didn't verify"))) {
							console.error(`\nExtra note: ${GetInvalidJWTErrorMessage(jwtTokenEnvVarName, false)}`);
						}
						return void WaitForEnterKeyThenExit(1);
					}
				}

				// for other write-issues, just report that message without changes
				saveSpinner.fail(`Failed to write file: ${writeIssue}`);
				return void WaitForEnterKeyThenExit(1);
			}

			saveSpinner.succeed(`Database backup saved to file: ${filePath} (time: ${((Date.now() - startTime) / 1000).toFixed(1)}s)`);

			// open file explorer (cross platform) to path above:
			if (process.platform === "win32") {
				child_process.exec(`start "" "${folderPathAbsolute}"`);
			} else {
				child_process.exec(`open "${folderPathAbsolute}"`);
			}

			return void WaitForEnterKeyThenExit(0);
		} catch (ex) {
			if (fetchSpinner?.isSpinning) fetchSpinner.fail(ex.toString());
			if (saveSpinner?.isSpinning) saveSpinner.fail(ex.toString());
			console.error("Got error during execution:", ex);
			return void WaitForEnterKeyThenExit(1);
		}
	});

const pgdumpContentsNotFoundMessage = `No string contents were found at json path: "data.getDBDump.pgdumpSql"`;
/** @returns {string|null} Returns null if successfully wrote file; else, reason for failure to write. */
function WriteStreamContentsToFileStream(stream, filePath) {
	// the pgdump result can be so long that it doesn't fit within a single NodeJS string, so stream the contents out into the target file
	const pipeline = chain([
		stream,
		parser({packStrings: false, streamStrings: true}),
		pick({filter: "data.getDBDump.pgdumpSql"}),
		data=>data.value,
	]);
	return new Promise((resolve, reject)=>{
		const fileStream = fs.createWriteStream(filePath);
		pipeline.on("error", reject);
		/*pipeline.on("data", async val=>{
			// only create write-stream once we've confirmed that there is data to write
			if (fileStream == null) {
				fileStream = fs.createWriteStream(filePath);
			}
			charsWritten += val.length;
			fileStream.write(val);
		});*/
		/*pipeline.on("readable", async ()=>{
			console.log("NewReadable");
			let val;
			while (null !== (val = pipeline.read())) {
				fileStream ??= fs.createWriteStream(filePath, {
					highWaterMark: 10000,
				});
				charsWritten += val.length;
				if (!fileStream.write(val)) {
					/*console.log("Wait");
					await new Promise(resolve=>fileStream.once("drain", resolve));
					console.log("Done");*#/
				}
			}
			console.log("Test1");
		});*/
		pipeline.pipe(fileStream);
		pipeline.on("end", ()=>{
			// calling end() is better than close(), as end() waits for the buffer to be flushed before closing the stream (https://github.com/nodejs/node/issues/5631#issuecomment-194509781)
			fileStream.end(()=>{
				if (fs.statSync(filePath).size == 0) {
					fs.unlinkSync(filePath);
					return void resolve(pgdumpContentsNotFoundMessage);
				}
				resolve(null);
			});
		});
	});
}

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