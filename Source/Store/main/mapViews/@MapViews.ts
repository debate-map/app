import {Vector2i} from "../../../Frame/General/VectorStructs";

export class MapViews {
	[key: number]: MapView;
}
export class MapView {
	//rootNodeView = new MapNodeView();
	// include root-node-view as a keyed-child, so that it's consistent with descendants (of key signifying id)
	//rootNodeView;
	rootNodeViews = {} as {[key: number]: MapNodeView};

	// if bot
	rootNodeID?: number;
}
export class MapNodeView {
	//constructor(childLimit?: number) {
	//constructor(childLimit: number) {
	/*constructor() {
		this.childLimit = State(a=>a.main.initialChildLimit);
	}*/

	expanded?: boolean;
	selected?: boolean;
	focused?: boolean;
	/** Offset of view-center from self (since we're the focus-node). */
	viewOffset?: Vector2i;
	openPanel?: string;
	openTermID?: number;
	children? = {} as {[key: number]: MapNodeView};
	childLimit_up?: number;
	childLimit_down?: number;
}