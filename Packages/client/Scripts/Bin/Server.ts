import {Serve} from "web-vcore/Scripts/Bin/Server";
import {webpackConfig} from "../Build/WebpackConfig";
import {config} from "../Config";

Serve(config, webpackConfig);