#!/usr/bin/env node

const {spawn} = require("child_process");
const net = require("net");
const path = require("path");
const fs = require("fs");
const {Command} = require("commander");

// Example usages:
// * Powershell (using env var): $env:PGPASSWORD="put the password here"; node ./Scripts/DBBackups/PGDumpBackupHelper.js --backup-dir ../Others/@Backups/DBDumps_ovh --pg-dump-path ../Others/@Backups/DBDumps_ovh/postgresql-15.7-2-windows-x64-binaries/pgsql/bin/pg_dump.exe
// * Powershell (using base64): node ./Scripts/DBBackups/PGDumpBackupHelper.js --backup-dir ../Others/@Backups/DBDumps_ovh --pg-dump-path ../Others/@Backups/DBDumps_ovh/postgresql-15.7-2-windows-x64-binaries/pgsql/bin/pg_dump.exe --password-base64 "cHV0IHRoZSBwYXNzd29yZCBoZXJl"
//   (To encode password to base64, use in powershell: `$env:PGPASSWORD="your-password-here"; node -e "console.log(Buffer.from(process.env.PGPASSWORD).toString('base64'))"` or in browser devtools: `btoa('your-password-here')`)

// parse command line arguments using commander
const program = new Command();
program
	.name("pg-backup")
	.description("PostgreSQL backup utility using pg_dump with automatic port-forwarding")
	.option("-b, --backup-dir <path>", "Backup directory", "../Others/@Backups/DBDumps_ovh")
	.option("--pg-dump-path <path>", "Path to pg_dump executable", "../Others/@Backups/DBDumps_ovh/postgresql-15.7-2-windows-x64-binaries/pgsql/bin/pg_dump.exe")
	.option("-u, --user <name>", "PostgreSQL user", "admin")
	.option("-s, --schema <name>", "Schema name", "app")
	.option("-d, --database <name>", "Database name", "debate-map")
	.option("--password <password>", "PostgreSQL password (or use PGPASSWORD env var -- that's actually more reliable)")
	.option("--password-base64 <password>", "PostgreSQL password encoded as base64 (useful for special characters in Task Scheduler)")
	.parse(process.argv);
const options = program.opts();

// decode base64 password if provided
let decodedPassword = options.password || process.env.PGPASSWORD;
if (options.passwordBase64) {
	decodedPassword = Buffer.from(options.passwordBase64, "base64").toString("utf-8");
}

const config = {
	localPort: 5220, // fixed port used by backend.forward_remote
	// local info
	backupDir: options.backupDir,
	pgDumpPath: options.pgDumpPath,
	// remote-db info
	pgUser: options.user,
	schema: options.schema,
	databaseName: options.database,
	pgPassword: decodedPassword,
};

// utils
// ==========

// function to check if port is in use
function isPortInUse(port) {
	return new Promise(resolve=>{
		const client = new net.Socket();
		client.once("connect", ()=>{
			client.destroy();
			resolve(true);
		});
		client.once("error", ()=>{
			resolve(false);
		});
		client.connect(port, "127.0.0.1");
	});
}

// function to wait for port to be ready
async function waitForPort(port, maxWaitSeconds = 30) {
	const startTime = Date.now();
	while ((Date.now() - startTime) / 1000 < maxWaitSeconds) {
		if (await isPortInUse(port)) {
			return true;
		}
		await new Promise(resolve=>setTimeout(resolve, 1000));
	}
	return false;
}

// keep this func aligned with the one in GQLBackupHelper.js
const CurrentTime_SafeStr = ()=>new Date().toLocaleString("sv").replace(/[ :]/g, "-"); // ex: 2021-12-10-09-18-52

// main function
// ==========

async function main() {
	console.log("\x1b[36m%s\x1b[0m", "Starting PostgreSQL backup process...");

	let portForwardProcess = null;
	const portInUse = await isPortInUse(config.localPort);

	if (portInUse) {
		console.log("\x1b[33m%s\x1b[0m", `Port ${config.localPort} is already in use (existing port-forward detected)`);
	} else {
		console.log("\x1b[36m%s\x1b[0m", `Port ${config.localPort} is available, creating port-forward...`);

		// Start port-forward using npm script
		portForwardProcess = spawn("npm", ["start", "backend.forward_remote"], {
			stdio: ["ignore", "pipe", "pipe"],
			shell: true
		});
		portForwardProcess.stdout.on("data", data=>{
			console.log(`[port-forward] ${data.toString().trim()}`);
		});
		portForwardProcess.stderr.on("data", data=>{
			console.log(`[port-forward] ${data.toString().trim()}`);
		});
		portForwardProcess.on("error", error=>{
			console.error("\x1b[31m%s\x1b[0m", `Port-forward process error: ${error.message}`);
		});

		// wait for port-forward to be ready
		console.log("\x1b[36m%s\x1b[0m", "Waiting for port-forward to establish...");
		const ready = await waitForPort(config.localPort);
		if (!ready) {
			throw new Error(`Port-forward did not establish within 30 seconds`);
		}

		console.log("\x1b[32m%s\x1b[0m", "Port-forward established successfully!");
	}

	try {
		// generate backup filename with current date and time
		//const now = new Date();
		//const timestamp = now.toLocaleString("sv").replace(/\s+/, "-") // "2025-12-22 13:30:00" -> "2025-12-22-13-30-00"
		//const timestamp = now.toISOString().replace(/T/, "-").replace(/:/g, "-").split(".")[0]; // "2025-12-22T13:30:00.101Z"
		const timestamp = CurrentTime_SafeStr();
		const backupFile = path.join(config.backupDir, `${timestamp}.sql`);

		console.log("\x1b[36m%s\x1b[0m", "Running pg_dump...");
		console.log("\x1b[90m%s\x1b[0m", `Database: ${config.databaseName}`);
		console.log("\x1b[90m%s\x1b[0m", `Schema: ${config.schema}`);
		console.log("\x1b[90m%s\x1b[0m", `Output: ${backupFile}`);

		// set password environment variable if provided
		const env = {...process.env};
		if (config.pgPassword) {
			env.PGPASSWORD = config.pgPassword;
		}

		// run pg_dump
		const pgDumpArgs = [
			"--verbose",
			"--host=localhost",
			`--port=${config.localPort}`,
			`--username=${config.pgUser}`,
			"--format=p",
			`--file=${backupFile}`,
			"-n", config.schema,
			config.databaseName
		];

		await new Promise((resolve, reject)=>{
			const pgDump = spawn(config.pgDumpPath, pgDumpArgs, {env, stdio: "inherit"});
			pgDump.on("close", code=>{
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(`pg_dump failed with exit code ${code}`));
				}
			});
			pgDump.on("error", error=>{
				reject(new Error(`pg_dump process error: ${error.message}`));
			});
		});

		console.log("\n\x1b[32m%s\x1b[0m", "Backup completed successfully!");
		console.log("\x1b[32m%s\x1b[0m", `Backup saved to: ${backupFile}`);

		if (fs.existsSync(backupFile)) {
			const stats = fs.statSync(backupFile);
			const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
			console.log("\x1b[32m%s\x1b[0m", `Backup size: ${fileSizeMB} MB`);
		}

	} catch (error) {
		console.error("\n\x1b[31m%s\x1b[0m", `Error occurred: ${error.message}`);
		process.exit(1);
	} finally {
		// cleanup: stop port-forward if we created it
		if (portForwardProcess) {
			console.log("\n\x1b[36m%s\x1b[0m", "Cleaning up port-forward...");
			portForwardProcess.kill();
			console.log("\x1b[32m%s\x1b[0m", "Port-forward closed.");
		}
	}
}

// run main function
main().catch(error=>{
	console.error("\x1b[31m%s\x1b[0m", `Fatal error: ${error.message}`);
	process.exit(1);
});