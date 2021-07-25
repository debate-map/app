import {ignore} from "web-vcore/nm/mobx-sync.js";
import {Graphlink} from "web-vcore/nm/mobx-graphlink.js";
import {Feedback_store} from "web-vcore/nm/graphql-feedback.js";
import {GraphDBShape} from "dm_common/Source/DBShape";
import {makeObservable, observable} from "web-vcore/nm/mobx.js";

const O = observable;
export class RootState {
	constructor() { makeObservable(this); }
	@O @ignore graphlink: Graphlink<RootState, GraphDBShape>;

	// modules
	@O.ref @ignore feedback = Feedback_store; // @O.ref needed due to details of how mobx/immer work -- will probably make unneeded later
	//@O @ignore feedback_graphlink = feedback_graph;
}

export const store = new RootState();
G({store});