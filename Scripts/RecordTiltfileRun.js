const fs = require("fs");

//console.log("Argv:", process.argv);
const env = process.argv[2];

const historyFileName = `../Temp/TiltfileRunHistory_${env}.json`;
/** @type {{runs: any[]}} */
const historyObj = JSON.parse(fs.existsSync(historyFileName) ? fs.readFileSync(historyFileName) : "{}");
historyObj.runs = historyObj.runs ?? [];

historyObj.runs.unshift({
	time: new Date().toUTCString(),
	// todo: have this also include some latest git-commit's hash or message (so if must restore remote cluster to an old state, we know which commit to use)
});
if (historyObj.runs.length > 100) historyObj.runs.length = 100;

fs.mkdirSync("../Temp", {recursive: true});
fs.writeFileSync(historyFileName, JSON.stringify(historyObj, null, "\t"));