import {Compile} from "vwebapp-framework/Scripts/Bin/Compile";
import {webpackConfig} from "../Build/WebpackConfig";
import {config} from "../Config";

Compile(config, webpackConfig);