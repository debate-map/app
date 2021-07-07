import {ignore} from "web-vcore/nm/mobx-sync.js";
import {Graphlink} from "web-vcore/nm/mobx-graphlink.js";
import {GraphDBShape} from "dm_common/Source/DBShape";
import {observable} from "web-vcore/nm/mobx.js";

const O = observable;
export class RootState {
	@O @ignore graphlink: Graphlink<RootState, GraphDBShape>;
}

export const store = new RootState();
G({store});