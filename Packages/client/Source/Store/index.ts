import {configure, makeObservable, onReactionError} from "web-vcore/nm/mobx.js";
import {O, HandleError, ConfigureMobX} from "web-vcore";
import {ignore} from "web-vcore/nm/mobx-sync.js";
import {Graphlink} from "web-vcore/nm/mobx-graphlink.js";
import {immerable, setUseProxies, setAutoFreeze} from "web-vcore/nm/immer.js";
import {GraphDBShape} from "dm_common";
import {Feedback_DBShape, Feedback_RootState, Feedback_store} from "web-vcore/nm/graphql-feedback";
import {MainState} from "./main.js";

//ConfigureMobX();

export class RootState {
	constructor() { makeObservable(this); }

	// [immerable] = true; // makes the store able to be used in immer's "produce" function

	@O main = new MainState();

	// @O forum: any;
	// @O feedback: Feedback_RootState;
	//@O.ref feedback: Feedback_RootState; // O.ref needed due to details of how mobx/immer work -- will probably make unneeded later

	/* @O @ignore firebase: any;
	@O @ignore firestore: any; */
	@O @ignore graphlink: Graphlink<RootState, GraphDBShape>;

	// modules
	//@O.ref feedback = Feedback_store; // @O.ref needed due to details of how mobx/immer work -- will probably make unneeded later
	@O feedback = Feedback_store;
	//@O @ignore feedback_graphlink = feedback_graph;

	// @O @ignore vMenu: VMenuState;
}

export const store = new RootState();
G({store});