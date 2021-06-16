import "mobx"; // import mobx before we declare the module below, otherwise vscode auto-importer gets confused at path to mobx
import {Graphlink, SetDefaultGraphOptions} from "web-vcore/nm/mobx-graphlink";
import {RootState, store} from "../../Store";
import {GraphDBShape} from "dm_common/Source/Store/db";
import {pgClient} from "./PGLink";

//declare module "web-vcore/node_modules/mobx-graphlink/Dist/UserTypes" { // temp fix; paths trick didn't work in this repo fsr
declare module "mobx-graphlink/Dist/UserTypes" {
	interface RootStoreShape extends RootState {}
	interface DBShape extends GraphDBShape {}
}

export const graph = new Graphlink<RootState, GraphDBShape>();
store.graphlink = graph;
SetDefaultGraphOptions({graph});

//const linkRootPath = `versions/v${dbVersion}-${DB_SHORT}`;
export function InitGraphlink() {
	graph.Initialize({rootStore: store, apollo: pgClient});
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