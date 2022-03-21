import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx.js";
import {MainState} from "./main.js";

export class RootState {
	constructor() { makeObservable(this); }

	@O main = new MainState();
}

export const store = new RootState();
G({store});