import {Compile} from "web-vcore/Scripts_Dist/Bin/Compile.js";
import {webpackConfig} from "../Build/WebpackConfig.js";
import {config} from "../Config.js";

Compile(config, webpackConfig);