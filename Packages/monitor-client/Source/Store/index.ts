import {O, wvc_store} from "web-vcore";
import {makeObservable} from "mobx";
import {MainState} from "./main.js";

export class RootState {
	constructor() { makeObservable(this); }

	@O main = new MainState();

	// modules
	@O wvc = wvc_store;
}

export const store = new RootState();
G({store});