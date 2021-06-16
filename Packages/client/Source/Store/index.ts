import {configure, onReactionError} from "mobx";
import {O, HandleError, ConfigureMobX} from "vwebapp-framework";
import {ignore} from "mobx-sync";
import {Firelink} from "mobx-firelink";
import {immerable, setUseProxies, setAutoFreeze} from "immer";
import {Feedback_RootState} from "firebase-feedback";
import {FirebaseDBShape} from "@debate-map/server-link/Source/Link";
import {MainState} from "./main";

//ConfigureMobX();

export class RootState {
	// [immerable] = true; // makes the store able to be used in immer's "produce" function

	@O main = new MainState();

	// @O forum: any;
	// @O feedback: Feedback_RootState;
	// @O.ref feedback = new Feedback_RootState(); // needed due to details of how mobx/immer work -- will probably make unneeded later
	@O.ref feedback: Feedback_RootState; // O.ref needed due to details of how mobx/immer work -- will probably make unneeded later

	/* @O @ignore firebase: any;
	@O @ignore firestore: any; */
	@O @ignore firelink: Firelink<RootState, FirebaseDBShape>;

	// @O @ignore vMenu: VMenuState;
}

export const store = new RootState();
G({store});