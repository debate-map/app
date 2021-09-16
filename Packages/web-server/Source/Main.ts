/*import express from "express";
import {createRequire} from "module";

const app = express();
app.use(express.static("../../Packages/client/Source_JS"));
app.use(express.static('files'))

const port = 8080;
app.listen(port);
console.log("Web-server started.");*/

import {createRequire} from "module";
const require = createRequire(import.meta.url);

// temp fix
import {Serve} from "web-vcore/Scripts_Dist/Bin/Server.js";

//import {webpackConfig} from "dm_client/Scripts/Build/WebpackConfig.js";
import {config} from "dm_client/Scripts/Config.js";

console.log("Web-server starting...");
//Serve(config, webpackConfig);
declare const DEV;
Serve(config, DEV ? require("../Build/WebpackConfig.js").webpackConfig : null);
console.log("Web-server started on:", process.env.PORT ?? 3005);