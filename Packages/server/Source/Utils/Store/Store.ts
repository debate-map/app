import {O} from "web-vcore";
import {ignore} from "web-vcore/nm/mobx-sync.js";
import {Graphlink} from "web-vcore/nm/mobx-graphlink.js";
import {GraphDBShape} from "dm_common/Source/DBShape";

export class RootState {
	@O @ignore graphlink: Graphlink<RootState, GraphDBShape>;
}

export const store = new RootState();
G({store});