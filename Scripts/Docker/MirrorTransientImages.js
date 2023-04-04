const {execSync} = require("child_process");
const {readFileSync} = require("fs");
const paths = require("path");

const pulumiOutput = JSON.parse(readFileSync(paths.resolve(__dirname, "../../PulumiOutput_Public.json")));
const privateRegistryURL = pulumiOutput["registryURL"];

//const fromImage = "registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi8-13.9-2"; // this version is gone now, so we'll go ahead and update for this first mirroring
const fromImage = "registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi8-15.1-0";
const toImage = fromImage.replace("registry.developers.crunchydata.com/crunchydata", privateRegistryURL);
//const toImage = fromImage.replace("registry.developers.crunchydata.com", privateRegistryURL);

RunStep(`docker pull ${fromImage}`);
RunStep(`docker tag ${fromImage} ${toImage}`);
RunStep(`docker push ${toImage}`);

function RunStep(command) {
	//console.log(command);
	execSync(command, {stdio: "inherit"});
}