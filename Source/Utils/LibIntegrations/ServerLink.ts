import "mobx"; // import mobx before we declare the module below, otherwise vscode auto-importer gets confused at path to mobx
import {dbVersion} from "Source/Main";
import {OnPopulated} from "vwebapp-framework";
import {RootState, store} from "Source/Store";
import {fire, InitFirelink} from "../../../Subrepos/Server/Source/@Shared/MobXFirelink";
//import {InitFirelink} from "@debate-map/server-link";

store.firelink = fire;

const linkRootPath = `versions/v${dbVersion}-${DB_SHORT}`;
export function InitServerLink() {
	InitFirelink(linkRootPath, store);
}

// additional mobx-firelink initialization
// ==========

declare module "mobx-firelink/Dist/UserTypes" {
	interface RootStoreShape extends RootState {}
	//interface DBShape extends FirebaseDBShape {}
}