#!/usr/bin/env node
// Needed for this to be executed as a command line utility

const cyclicUtils = require("./");
const path = require("path");
const fs = require("fs");
const commandLineArgs = require("command-line-args");

const usage = "    Usage: iscyclic stats.json [--include-node-modules]";
const options = commandLineArgs([
    {name: "include-node-modules", type: Boolean},
]);

const fileName = process.argv[2];
if (!fileName) {
    console.error("No filename was passed to this script!");
    console.error(usage);
    process.exit(1);
}

// Verify the existence of the stats.json file passed in...
const filePath = path.join(process.cwd(), process.argv[2]);
try {
    // This command throws if file isn't found
    const stats = fs.lstatSync(filePath);
} catch(e) {
    console.error(`Input file ${filePath} was not found!`);
    console.error(usage);
    process.exit(1);
}

const dataFile = require(filePath);
var moduleInfos;
// if stats file, parse into module-info map
if (dataFile.modules) {
	moduleInfos = cyclicUtils.GetModuleInfosFromStats(statsJson, options["include-node-modules"]);
} else { // else, assume file is a simple module-info map already
	moduleInfos = dataFile;
}

cyclicUtils.LogCycles(moduleInfos);