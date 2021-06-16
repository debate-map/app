import {Compile} from "web-vcore/Scripts/Bin/Compile";
import {webpackConfig} from "../Build/WebpackConfig";
import {config} from "../Config";

Compile(config, webpackConfig);