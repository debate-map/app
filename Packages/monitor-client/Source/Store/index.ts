import {O, wvc_store} from "web-vcore";
import {MainState} from "./main.js";

export class RootState {
	@O accessor main = new MainState();

	// modules
	@O accessor wvc = wvc_store;
}

export const store = new RootState();
G({store});