import {Serve} from "web-vcore/Scripts/Bin/Server.js";
import {webpackConfig} from "../Build/WebpackConfig.js";
import {config} from "../Config.js";

Serve(config, webpackConfig);