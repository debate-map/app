import "mobx"; // import mobx before we declare the module below, otherwise vscode auto-importer gets confused at path to mobx
import {dbVersion} from "Main";
import {OnPopulated} from "vwebapp-framework";
import {RootState, store} from "Store";
import {fire, InitFirelink} from "../../../Subrepos/Server";
//import {InitFirelink} from "@debate-map/server-link";

store.firelink = fire;

const linkRootPath = `versions/v${dbVersion}-${DB_SHORT}`;
OnPopulated(()=>{
	InitFirelink(linkRootPath, store);
});

// additional mobx-firelink initialization
// ==========

declare module "mobx-firelink/Dist/UserTypes" {
	interface RootStoreShape extends RootState {}
	//interface DBShape extends FirebaseDBShape {}
}