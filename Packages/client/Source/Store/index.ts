import {configure, makeObservable, onReactionError} from "mobx";
import {O, wvc_store} from "web-vcore";
import {ignore} from "mobx-sync";
import {Graphlink} from "mobx-graphlink";
import {immerable, setUseProxies, setAutoFreeze} from "immer";
import {GraphDBShape} from "dm_common";
import {MainState} from "./main.js";

//ConfigureMobX();

export class RootState {
	constructor() { makeObservable(this); }

	// [immerable] = true; // makes the store able to be used in immer's "produce" function

	@O main = new MainState();

	/* @O @ignore firebase: any;
	@O @ignore firestore: any; */
	@O @ignore graphlink: Graphlink<RootState, GraphDBShape>;

	// modules
	@O wvc = wvc_store;

	// @O @ignore vMenu: VMenuState;
}

export const store = new RootState();
G({store});