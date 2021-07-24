import {makeObservable, observable} from "web-vcore/nm/mobx.js";
import {Vector2, Clone} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, RunXOnceSchemasAdded, schemaEntryJSONs} from "web-vcore/nm/mobx-graphlink.js";

const O = observable;

export class MapView {
	constructor() { makeObservable(this); }

	// rootNodeView = new MapNodeView();
	// include root-node-view as a keyed-child, so that it's consistent with descendants (of key signifying id)
	// rootNodeView;
	// @O rootNodeViews = observable.map<string, MapNodeView>();
	// use simple object rather than observable-map, since observable-map would lose its prototype on page refresh (when mobx-sync starts loading stored data, this path is not initialized-with-types, since it's nested/non-static)
	// maybe todo: update mobx-sync to at least be able to handle the mobx classes (observable.map, observable.array, etc.)
	@O rootNodeViews = {} as {[key: string]: MapNodeView};

	// client-side only, for when rendering for crawler/bot
	@O bot_currentNodeID?: string;
}
AddSchema("MapView", {
	properties: {
		rootNodeViews: {patternProperties: {".{22}": {$ref: "MapNodeView"}}},
	},
	required: ["rootNodeViews"],
});

export class MapNodeView {
	// constructor(childLimit?: number) {
	// constructor(childLimit: number) {
	/*constructor() {
		//this.childLimit = State(a=>a.main.initialChildLimit);
		// try to catch cause of odd "MapNodeView.children is undefined" issue hit sometimes
		Assert(this.children != null);
		new Timer(100, ()=>Assert(this.children != null), 1).Start();
	}*/

	@O expanded?: boolean;
	/* expanded_truth?: boolean;
	expanded_relevance?: boolean; */
	@O expanded_truth? = true;
	@O expanded_relevance? = true;
	/** True for node which is selected (ie. has its hover-panel locked open). */
	@O selected?: boolean;
	/** True for node whose box is closest to the view center. */
	@O focused?: boolean;
	/** Offset of view-center from self (since we're the focus-node). */
	@O viewOffset?: Vector2;
	@O openPanel?: string;
	@O openTermID?: string;

	// @O children? = observable.map<string, MapNodeView>();
	@O children = {} as {[key: string]: MapNodeView};
	@O childLimit_up?: number;
	@O childLimit_down?: number;
}
export const emptyNodeView = new MapNodeView();
AddSchema("MapNodeView", ["Vector2"], ()=>({
	properties: {
		expanded: {type: "boolean"},
		expanded_truth: {type: "boolean"},
		expanded_relevance: {type: "boolean"},
		selected: {type: "boolean"},
		focused: {type: "boolean"},
		viewOffset: {$ref: "Vector2"},
		openPanel: {type: "string"},
		openTermID: {type: "string"},

		children: {patternProperties: {".{22}": {$ref: "MapNodeView"}}},
		childLimit_up: {type: "number"},
		childLimit_down: {type: "number"},
	},
}));
//RunXOnceSchemasAdded(["Vector2"], ()=>console.log("Should be done...", schemaEntryJSONs.get("MapNodeView")));

// export type MapNodeView_SelfOnly = Omit<MapNodeView, 'children'>;
// export const MapNodeView_SelfOnly_props = ['expanded', 'expanded_truth', 'expanded_relevance', 'selected', 'focused', 'viewOffset', 'openPanel', 'openTermID', 'childLimit_up', 'childLimit_down'];

/*export function NormalizedMapView(mapView: MapView) {
	const result = Clone(mapView);
	return result;
}*/