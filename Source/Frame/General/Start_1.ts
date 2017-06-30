//import JQuery from "../JQuery/JQuery3.1.0";
let JQuery = jQuery; // include JQuery file directly from html, for faster building
import React from "react";

G({JQuery, jQuery: JQuery, $: JQuery}); declare global { const JQuery; /*const jQuery; const $;*/ }
G({React}); declare global { const React; }