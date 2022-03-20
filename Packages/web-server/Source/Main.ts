/*import express from "express";
import {createRequire} from "module";

const app = express();
app.use(express.static("../../Packages/client/Source_JS"));
app.use(express.static('files'))

const port = 8080;
app.listen(port);
console.log("Web-server started.");*/

// temp fix
import {Serve} from "web-vcore/Scripts_Dist/Bin/Server.js";

import {config} from "dm_client/Scripts/Config.js";
import {DEV} from "web-vcore/Scripts/@CJS/EnvHelper.js";

/*
//import {webpackConfig} from "dm_client/Scripts/Build/WebpackConfig.js";
import {createRequire} from "module";
const require = createRequire(import.meta.url);
//Serve(config, webpackConfig);
Serve(config, DEV ? require("../Build/WebpackConfig.js").webpackConfig : null);
*/

// change web-server port from 5101 (used for webpack-based serving) to 5100, since we're in the kubernetes web-server pod
config.server_port = 5100;

// pass null for webpackConfig, so that "express.static(...)" is used rather than "webpack(...)";
//		this makes the web-server pod run the same way on local-k8s as it does on remote-k8s;
//		if you want to use webpack to serve the files, run `npm start client.dev` instead (and navigate to localhost:5101, rather than localhost:5100)
Serve(config, null);

console.log("Web-server started on:", process.env.PORT ?? 5100, "@dev:", DEV);