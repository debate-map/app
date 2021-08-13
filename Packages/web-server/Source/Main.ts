/*import express from "express";
import {createRequire} from "module";

const app = express();
app.use(express.static("../../Packages/client/Source_JS"));
app.use(express.static('files'))

const port = 8080;
app.listen(port);
console.log("Web-server started.");*/

// temp fix
/*import {createRequire} from "module";
const require = createRequire(import.meta.url);*/

// temp fix
import {Serve} from "web-vcore/Scripts_Dist/Bin/Server.js";
//const {Serve} = require("web-vcore/Scripts/Bin/Server.js");
//const {Serve} = require("web-vcore/Scripts_Dist/Bin/Server.js");
//const {Serve} = await import("web-vcore/Scripts_Dist/Bin/Server.js");

import {webpackConfig} from "dm_client/Scripts/Build/WebpackConfig.js";
//const {webpackConfig} = require("dm_client/Scripts/Build/WebpackConfig.ts");
//const {webpackConfig} = await import("dm_client/Scripts/Build/WebpackConfig.js");
import {config} from "dm_client/Scripts/Config.js";
//const {config} = require("dm_client/Scripts/Config.ts");
//const {config} = await import("dm_client/Scripts/Config.js");

console.log("Web-server starting...");
Serve(config, webpackConfig);
console.log("Web-server started.");