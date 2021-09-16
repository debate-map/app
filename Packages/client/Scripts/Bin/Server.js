import {Serve} from "web-vcore/Scripts_Dist/Bin/Server.js";
//import {webpackConfig} from "../Build/WebpackConfig.js";
import {config} from "../Config.js";
import {createRequire} from "module";
const require = createRequire(import.meta.url);

Serve(config, DEV ? require("../Build/WebpackConfig.js").webpackConfig : null);