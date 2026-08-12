import {Ignore, O, wvc_store} from "web-vcore";
import {Graphlink} from "mobx-graphlink";
import {immerable, setUseProxies, setAutoFreeze} from "immer";
import {GraphDBShape} from "dm_common";
import {MainState} from "./main.js";

//ConfigureMobX();

export class RootState {
	// [immerable] = true; // makes the store able to be used in immer's "produce" function

	@O accessor main = new MainState();

	/* @O  @Ignore accessor firebase: any;
	@O  @Ignore accessor firestore: any; */
	@O  @Ignore accessor graphlink: Graphlink<RootState, GraphDBShape>;

	// modules
	@O accessor wvc = wvc_store;

	// @O  @Ignore accessor vMenu: VMenuState;
}

export const store = new RootState();
G({store});