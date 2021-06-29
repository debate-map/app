import {CreateConfig} from "web-vcore/Scripts/Config.js";
import path, {dirname} from "path";

// @ts-ignore
const __dirname = path.join(path.dirname(decodeURI(new URL(import.meta.url).pathname))).replace(/^\\([A-Z]:\\)/, "$1");

const {NODE_ENV, PORT, USE_TSLOADER, BASENAME} = process.env;

// modify the imported config-base, then return it (that's fine/intended)
export const config = CreateConfig({
	path_base: path.resolve(__dirname, ".."),
	//path_base: path.resolve(".."), // if cwd is Scripts
	//path_base: path.resolve("."), // if cwd is root
	server_port: PORT || 3005,
});