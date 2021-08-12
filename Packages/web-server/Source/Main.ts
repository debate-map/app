/*import express from "express";
import {createRequire} from "module";

const app = express();
app.use(express.static("../../Packages/client/Source_JS"));
app.use(express.static('files'))

const port = 8080;
app.listen(port);
console.log("Web-server started.");*/

import {Serve} from "web-vcore/Scripts/Bin/Server.js";
import {webpackConfig} from "dm_client/Scripts/Build/WebpackConfig.js";
import {config} from "dm_client/Scripts/Config.js";

console.log("Web-server starting...");
Serve(config, webpackConfig);
console.log("Web-server started.");