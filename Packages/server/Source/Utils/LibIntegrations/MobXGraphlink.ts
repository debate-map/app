import {GraphDBShape, systemUserID, systemUserName} from "dm_common";
import "web-vcore/nm/mobx"; // import mobx before we declare the module below, otherwise vscode auto-importer gets confused at path to mobx
import {Graphlink, SetDefaultGraphOptions, ProvideReactModule} from "web-vcore/nm/mobx-graphlink.js";
import React from "react";
import {RootState, store} from "../Store/Store.js";
import {pgClient} from "./PGLink.js";

declare module "mobx-graphlink/Dist/UserTypes" {
	interface RootStoreShape extends RootState {}
	//interface DBShape extends GraphDBShape {}
}

export const graph = new Graphlink<RootState, GraphDBShape>();
store.graphlink = graph;
SetDefaultGraphOptions({graph});

export function InitGraphlink() {
	graph.Initialize({
		rootStore: store,
		apollo: pgClient as any, // the "as any" is needed if "mobx-graphlink" is npm-linked from "web-vcore"
	});
	graph.userInfo = {id: systemUserID, displayName: systemUserName};
	ProvideReactModule(React);
}