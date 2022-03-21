import {AddWVCSchemas, ExposeModuleExports} from "web-vcore";
import {AddSchema} from "web-vcore/nm/mobx-graphlink.js";
import {InitApollo} from "./Apollo.js";
import {InitReactVComponents} from "./ReactVComponents.js";
import {InitWVC} from "./WVC.js";

function ExposeModuleExports_Final() {
	// expose exports
	if (DEV) {
		setTimeout(()=>{
			const wrr = ExposeModuleExports();
			//FixStoreAccessorFuncNames(wrr);
		}, 500); // wait a bit, since otherwise some modules are missed/empty during ParseModuleData it seems
	} else {
		G({RR: ()=>{
			const wrr = ExposeModuleExports();
			//FixStoreAccessorFuncNames(wrr);
			return wrr.moduleExports_flat;
		}});
	}
}

AddWVCSchemas(AddSchema);
export function InitLibs() {
	InitApollo();
	InitWVC();
	//InitReactJS();
	InitReactVComponents();

	ExposeModuleExports_Final();
}