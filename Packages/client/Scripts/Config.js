import {CreateConfig} from "web-vcore/Scripts_Dist/Config.js";
import path, {dirname} from "path";
import {createRequire} from "module";

// @ts-ignore
const __dirname = path.join(path.dirname(decodeURI(new URL(import.meta.url).pathname))).replace(/^\\([A-Z]:\\)/, "$1");

const require = createRequire(import.meta.url);
require("dotenv").config({path: `${__dirname}/../../../.env`});

const {NODE_ENV, PORT, USE_TSLOADER} = process.env;

// modify the imported config-base, then return it (that's fine/intended)
export const config = CreateConfig({
	path_base: path.resolve(__dirname, ".."),
	//path_base: path.resolve(".."), // if cwd is Scripts
	//path_base: path.resolve("."), // if cwd is root
	server_port: PORT || 5101, // webpack serves to 5101; k8s web-server serves to 5100 (see Tiltfile for full details)
});
const S = JSON.stringify;
/*Object.assign(config.codeVarReplacements, {
	//"process.env.CLIENT_ID": S(process.env.CLIENT_ID), // modify existing entry instead
});*/
//console.log("Found:", process.env);

/*const googleClientID_randomPart = S(process.env.CLIENT_ID)?.replace(".apps.googleusercontent.com", "");
console.log("GClientID:", `${googleClientID_randomPart.slice(0, 2)}...${googleClientID_randomPart.slice(-2)}`);*/
config.codeVarReplacements["process.env"]["CLIENT_ID"] = S(process.env.CLIENT_ID); // CLIENT_ID is supplied by the ".env" file