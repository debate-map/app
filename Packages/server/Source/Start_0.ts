import {createRequire} from "module";
const require = createRequire(import.meta.url);

require("dotenv").config({path: "../../.env"});

// polyfills of browser things
globalThis.WebSocket = require("ws");
globalThis.performance = {now: ()=>Date.now()} as any;