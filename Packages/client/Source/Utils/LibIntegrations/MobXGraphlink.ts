import {GraphDBShape} from "dm_common";
import "web-vcore/nm/mobx"; // import mobx before we declare the module below, otherwise vscode auto-importer gets confused at path to mobx
import {Graphlink, SetDefaultGraphOptions, ProvideReactModule} from "web-vcore/nm/mobx-graphlink.js";
import React from "react";
import {GetCookie} from "web-vcore";
import {MAX_TIMEOUT_DURATION} from "ui-debug-kit";
import {RootState, store} from "../../Store/index.js";
import {apolloClient} from "./Apollo.js";

//declare module "web-vcore/node_modules/mobx-graphlink/Dist/UserTypes" { // temp fix; paths trick didn't work in this repo fsr
declare module "mobx-graphlink/Dist/UserTypes" {
	interface UT_StoreShape extends RootState {}
	//interface DBShape extends GraphDBShape {} // moved to DBShape.ts
}

export const graph = new Graphlink<RootState, GraphDBShape>();
store.graphlink = graph;
SetDefaultGraphOptions({graph});

//const linkRootPath = `versions/v${dbVersion}-${DB_SHORT}`;
export function InitGraphlink() {
	//apolloPromise: Promise<{userID: string}>
	//const {userID} = await apolloPromise;

	graph.Initialize({
		rootStore: store,
		apollo: apolloClient as any, // the "as any" is needed if "mobx-graphlink" is npm-linked from "web-vcore"
		onServer: false,
		//unsubscribeTreeNodesAfter: 30000, // on live-query's data becoming unobserved, wait 30s before unsubscribing (user may re-expand something just closed, in the short-term)
		unsubscribeTreeNodesAfter: GetMGLUnsubscribeDelay(),
	});
	// user-info is now supplied at the end of InitApollo() instead
	/*graph.userInfo = {
		// todo: probably replace debate-map-userid with just the return-result of _PassConnectionID
		id: GetCookie("debate-map-userid")!,
		//id: userID,
	};*/
	ProvideReactModule(React);
}

export function GetMGLUnsubscribeDelay() {
	return store.main.blockMobXUnsubscribing ? MAX_TIMEOUT_DURATION : 5000;
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