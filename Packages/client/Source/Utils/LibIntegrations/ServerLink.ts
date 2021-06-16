import "mobx"; // import mobx before we declare the module below, otherwise vscode auto-importer gets confused at path to mobx
import {dbVersion} from "Main";
import {OnPopulated} from "vwebapp-framework";
import {RootState, store} from "Store";
import {fire, InitFirelink, FirebaseDBShape} from "@debate-map/server-link/Source/Link";
//import {InitFirelink} from "@debate-map/server-link";

store.firelink = fire as any; // "as any" needed fsr

const linkRootPath = `versions/v${dbVersion}-${DB_SHORT}`;
export function InitServerLink() {
	InitFirelink(linkRootPath, store);
}

// additional mobx-firelink initialization
// ==========

declare module "mobx-firelink/Dist/UserTypes" {
	interface RootStoreShape extends RootState {}
	interface DBShape extends FirebaseDBShape {} // already added by includes from @debate-map/server-link/Source
}