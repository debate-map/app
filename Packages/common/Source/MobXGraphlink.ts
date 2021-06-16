import {RootState, store} from "Store";
import "mobx"; // import mobx before we declare the module below, otherwise vscode auto-importer gets confused at path to mobx
import {Graphlink, SetDefaultGraphOptions} from "web-vcore/nm/mobx-graphlink";
import {FirebaseDBShape} from "./Store/firebase";

declare module "mobx-graphlink/Dist/UserTypes" {
	interface RootStoreShape extends RootState {}
	interface DBShape extends GraphDBShape {}
}

export const graph = new Graphlink<RootState, GraphDBShape>();
store.graphlink = graph;
SetDefaultGraphOptions({graph});

export function InitGraphlink(rootPathInDB: string, rootStore: any) {
	//const linkRootPath = `versions/v${dbVersion}-${DB_SHORT}`;
	graph.Initialize({rootPathInDB, rootStore});

	// start auto-runs after store+firelink are created
	//require("./Utils/AutoRuns");
}

// modify some default options
// StoreAccessorOptions.default.cache_keepAlive = true;

// mobx debug helper
// ==========

/*window['mobxDevtools_processChange'] = (change) => {
	// change.rootStoreData = store;
	/* change.mapViews = store.main.mapViews['raw'];
	change.mapViews._sendFull = true; *#/
	change.mapViews = { _serialize() {
		// return store.main.mapViews['raw'];
		return Clone(store.main.mapViews['raw']);
	} };
};*/