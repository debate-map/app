import {Serve} from "web-vcore/Scripts_Dist/Bin/Server.js";
import {webpackConfig} from "../Build/WebpackConfig.js";
import {config} from "../Config.js";

console.log(webpackConfig);

Serve(config, webpackConfig);