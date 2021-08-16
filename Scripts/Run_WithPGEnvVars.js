const child_process = require("child_process");
// secretsStr is a text string like the below (except with SOME_STR being the value in base64)
//map[dbname:SOME_STR host:SOME_STR password:SOME_STR port:SOME_STR uri:SOME_STR user:SOME_STR verifier:SOME_STR]
const secretsStr = child_process.execSync("kubectl get secrets -n postgres-operator debate-map-pguser-admin -o go-template='{{.data}}'").toString();
const keyValuePairs = secretsStr.match(/\[(.+)\]/)[1].split(" ").map(keyValPairStr=>keyValPairStr.split(":"));

// from: Packages/app-server/deployment.yaml
/*const envMapping = {
	host: "DB_ADDR",
	port: "DB_PORT",
	dbname: "DB_DATABASE",
	user: "DB_USER",
	password: "DB_PASSWORD",
};
const fromBase64 = str=>Buffer.from(str, "base64");
setk8sEnvVars_commandStr = `cross-env ${keyValuePairs.map(pair=>{
	let key = pair[0];
	let endKey = envMapping[pair[0]];
	let val = fromBase64(pair[1]);
	if (key == "host") val = "localhost";
	//if (key == "port") val = "8081";
	if (key == "port") val = "3205";
	return `${endKey}="${val}"`;
}).join(" ")} NODE_TLS_REJECT_UNAUTHORIZED='0' `; // tls change needed atm, till I figure out how to copy over signing data*/

const fromBase64 = str=>Buffer.from(str, "base64");
const GetEnvVal = name=>fromBase64(keyValuePairs.find(a=>a[0] == name)[1]);
const newEnvVars = {
	...process.env,

	// node-js flag
	NODE_TLS_REJECT_UNAUTHORIZED: 0,

	// app-level
	//DB_ADDR: GetEnvVal("host"),
	DB_ADDR: "localhost",
	//DB_PORT: GetEnvVal("port"),
	DB_PORT: 3205,
	DB_DATABASE: GetEnvVal("dbname"),
	DB_USER: GetEnvVal("user"),
	DB_PASSWORD: GetEnvVal("password"),
};

const commandName = process.argv[2];
const commandArgs = process.argv.slice(3);
//console.log("Test:", commandName, commandArgs);

var {spawn} = require("child_process");
var spawn = spawn(
	commandName,
	commandArgs,
	{
		//cwd: ".",
		//cwd: __dirname,
		cwd: process.cwd(),
		stdio: "inherit",
		//detached: true,

		env: newEnvVars,

	},
);