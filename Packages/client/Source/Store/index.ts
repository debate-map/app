import {O, wvc_store} from "web-vcore";
import {Graphlink} from "mobx-graphlink";
import {immerable, setUseProxies, setAutoFreeze} from "immer";
import {GraphDBShape} from "dm_common";
import {MainState} from "./main.js";
import {ignore} from "mobx-sync";

//ConfigureMobX();

export class RootState {
	// [immerable] = true; // makes the store able to be used in immer's "produce" function

	@O accessor main = new MainState();

	/* @O @ignore accessor firebase: any;
	@O @ignore accessor firestore: any; */
	@O @ignore accessor graphlink: Graphlink<RootState, GraphDBShape>;

	// modules
	@O accessor wvc = wvc_store;

	// @O @ignore accessor vMenu: VMenuState;
}

export const store = new RootState();
G({store});