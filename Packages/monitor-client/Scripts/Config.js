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
	server_port: PORT || 5131, // webpack serves to 5131; k8s web-server serves to 5130 (see Tiltfile for full details)
});