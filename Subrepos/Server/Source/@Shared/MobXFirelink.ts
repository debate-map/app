import "mobx"; // import mobx before we declare the module below, otherwise vscode auto-importer gets confused at path to mobx
import {Firelink, GetDoc, SetDefaultFireOptions, StoreAccessorOptions} from "mobx-firelink";
import {RootStoreShape} from "mobx-firelink/Dist/UserTypes";
import {FirebaseDBShape} from "./Store/firebase";

declare module "mobx-firelink/Dist/UserTypes" {
	//interface RootStoreShape extends RootState {}
	interface DBShape extends FirebaseDBShape {}
}

export const fire = new Firelink<RootStoreShape, FirebaseDBShape>();
//store.firelink = fire;
SetDefaultFireOptions({fire});
// console.log('Default fire options set:', { fire });
//OnPopulated(()=>fire.InitSubs());

export function InitFirelink(rootPathInDB: string, rootStore: any) {
	//const linkRootPath = `versions/v${dbVersion}-${DB_SHORT}`;
	fire.Initialize({rootPathInDB, rootStore});

	// start auto-runs after store+firelink are created
	//require("./Utils/AutoRuns");
}

// modify some default options
// StoreAccessorOptions.default.cache_keepAlive = true;

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