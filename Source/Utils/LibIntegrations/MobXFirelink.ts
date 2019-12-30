import "mobx"; // import mobx before we declare the module below, otherwise vscode auto-importer gets confused at path to mobx
import {Firelink, GetDoc, SetDefaultFireOptions, StoreAccessorOptions} from "mobx-firelink";
import {dbVersion} from "Main";
import {FirebaseDBShape} from "Store/firebase";
import {store, RootState} from "Store";
import {OnPopulated} from "vwebapp-framework";
import {Clone} from "js-vextensions";

declare module "mobx-firelink/Dist/UserTypes" {
	interface RootStoreShape extends RootState {}
	interface DBShape extends FirebaseDBShape {}
}

const linkRootPath = `versions/v${dbVersion}-${DB_SHORT}`;
export const fire = new Firelink<RootState, FirebaseDBShape>(linkRootPath, store, false);
store.firelink = fire;
SetDefaultFireOptions({fire});
// console.log('Default fire options set:', { fire });
OnPopulated(()=>fire.InitSubs());

// modify some default options
// StoreAccessorOptions.default.cache_keepAlive = true;

// start auto-runs after store+firelink are created
require("Utils/AutoRuns");

// mobx debug helper
// ==========

/* window['mobxDevtools_processChange'] = (change) => {
	// change.rootStoreData = store;
	/* change.mapViews = store.main.mapViews['raw'];
	change.mapViews._sendFull = true; *#/
	change.mapViews = { _serialize() {
		// return store.main.mapViews['raw'];
		return Clone(store.main.mapViews['raw']);
	} };
}; */