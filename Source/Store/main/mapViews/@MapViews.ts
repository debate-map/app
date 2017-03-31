import {Vector2i} from "../../../Frame/General/VectorStructs";

export class MapViews {
	[key: number]: MapView;
}
export class MapView {
	rootNodeView = new MapNodeView();
	focusNode: string;
	/** Offset of view-center from focus-node. */
	viewOffset: Vector2i;
}
export class MapNodeView {
	expanded?: boolean;
	selected?: boolean;
	openPanel?: string;
	children = {} as {[key: string]: MapNodeView};
}