const fs = require("fs");
const paths = require("path");
const {spawnSync} = require("child_process");

//import {dirname} from "path";
//import {fileURLToPath} from "url";
//const __dirname = dirname(fileURLToPath(import.meta.url));

console.log("Apply patches at subdep level...");
/*execSync(`node ./Scripts/@CJS/ApplyPatches_Sub.js`);
if (fs.existsSync(`${__dirname}/../../../node_modules/web-vcore`)) {
	execSync(`cd "${paths.join(__dirname, "..", "..", "..")}" && node ./node_modules/web-vcore/Scripts/@CJS/ApplyPatches_Sub.js`);
}*/
spawnSync("node", ["./Scripts/@CJS/ApplyPatches_Sub.js", "level=1"], {
	cwd: paths.join(__dirname, "..", ".."),
	stdio: "inherit",
});
if (fs.existsSync(`${__dirname}/../../../../node_modules/web-vcore`)) {
	console.log("Apply patches at peer level...");
	spawnSync("node", ["./node_modules/web-vcore/Scripts/@CJS/ApplyPatches_Sub.js", "level=0"], {
		cwd: paths.join(__dirname, "..", "..", "..", ".."),
		stdio: "inherit",
	});
}
//console.log("Done");