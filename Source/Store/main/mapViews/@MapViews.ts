import {Vector2i} from "../../../Frame/General/VectorStructs";

export class MapViews {
	[key: number]: MapView;
}
export class MapView {
	//rootNodeView = new MapNodeView();
	// include root-node-view as a keyed-child, so that it's consistent with descendants (of key signifying id)
	//rootNodeView;
	rootNodeViews = {} as {[key: number]: MapNodeView};
}
export class MapNodeView {
	//constructor(childLimit?: number) {
	//constructor(childLimit: number) {
	/*constructor() {
		this.childLimit = State(a=>a.main.initialChildLimit);
	}*/

	expanded?: boolean;
	selected?: boolean;
	focus?: boolean;
	/** Offset of view-center from self (since we're the focus-node). */
	viewOffset?: Vector2i;
	openPanel?: string;
	children? = {} as {[key: string]: MapNodeView};
	childLimit?: number;
}