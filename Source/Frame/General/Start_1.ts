import JQuery from "../JQuery/JQuery3.1.0";
import React from "react";

G({JQuery, jQuery: JQuery, $: JQuery}); declare global { const JQuery; /*const jQuery; const $;*/ }
G({React}); declare global { const React; }