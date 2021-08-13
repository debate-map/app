import {createRequire} from "module";
const require = createRequire(import.meta.url);

// for local/direct server runs, we use this; for k8s ones, we do as well atm (but plan to shift to using k8s secrets or something in the future)
require("dotenv").config({path: "../../.env"});

// polyfills of browser things
globalThis.WebSocket = require("ws");
globalThis.performance = {now: ()=>Date.now()} as any;