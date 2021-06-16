import "."; // ensure file stays a module
import {VWAF_OverrideExport} from "vwebapp-framework";

/*
Example contents:
==========
declare module 'vwebapp-framework' {
	function OnAccessPath(path: string): void;
}
VWAF_OverrideExport('OnAccessPath', (path: string)=> {
	Log(`Accessing-path Stage1: ${path}`);
});
===========
*/

// add the definitions for overrides here
// ==========

declare module "vwebapp-framework" {
}

// add the implementations/js-code for overrides here
// ==========