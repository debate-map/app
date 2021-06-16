import "."; // ensure file stays a module
import {VWAF_OverrideExport} from "web-vcore";

/*
Example contents:
==========
declare module 'web-vcore' {
	function OnAccessPath(path: string): void;
}
VWAF_OverrideExport('OnAccessPath', (path: string)=> {
	Log(`Accessing-path Stage1: ${path}`);
});
===========
*/

// add the definitions for overrides here
// ==========

declare module "web-vcore" {
}

// add the implementations/js-code for overrides here
// ==========