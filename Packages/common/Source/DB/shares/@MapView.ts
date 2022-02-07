import {makeObservable, observable} from "web-vcore/nm/mobx.js";
import {Vector2, Clone, GetValues} from "web-vcore/nm/js-vextensions.js";
import {accessorMetadata, AddSchema, CreateAccessor, DB, defaultGraphOptions, Field, MGLClass, RunXOnceSchemasAdded, schemaEntryJSONs} from "web-vcore/nm/mobx-graphlink.js";
import {ignore} from "web-vcore/nm/mobx-sync.js";
import {GetNode, GetNodeID, GetParentNodeID, ToPathNodes} from "../../DB/nodes.js";
import {MapNodeType} from "../../DB/nodes/@MapNodeType.js";

// this module is in "dm_common", so avoid import from web-vcore (just be careful, since the new @O doesn't warn about classes with missing makeObservable calls)
//import {O} from "web-vcore";
const O = observable;

@MGLClass()
export class MapView {
	constructor() { makeObservable(this); }

	// rootNodeView = new MapNodeView();
	// include root-node-view as a keyed-child, so that it's consistent with descendants (of key signifying id)
	// rootNodeView;
	// @O rootNodeViews = observable.map<string, MapNodeView>();
	// use simple object rather than observable-map, since observable-map would lose its prototype on page refresh (when mobx-sync starts loading stored data, this path is not initialized-with-types, since it's nested/non-static)
	// maybe todo: update mobx-sync to at least be able to handle the mobx classes (observable.map, observable.array, etc.)

	//@DB((t, n)=>t.jsonb(n))
	@Field({
		$gqlType: "JSON",
		patternProperties: {".{22}": {$ref: "MapNodeView"}},
	})
	@O rootNodeViews = {} as {[key: string]: MapNodeView};

	// client-side only, for when rendering for crawler/bot
	@O bot_currentNodeID?: string;
}

export const GetDefaultExpansionFieldsForNodeView = CreateAccessor((path: string)=>{
	//const pathNodes = ToPathNodes(path);
	const nodeID = GetNodeID(path);
	const parentID = GetParentNodeID(path);
	const node = GetNode(nodeID);
	const parentNode = GetNode(parentID);
	//console.log("Checking. @nodeID:", nodeID, "@parentID:", parentID, "@node:", node, "@parentNode:", parentNode);

	const result = {expanded: false, expanded_truth: false, expanded_relevance: false};
	if (node?.type == MapNodeType.argument && !node.multiPremiseArgument) {
		result.expanded = true;
	} else if (node?.type == MapNodeType.claim && parentNode?.multiPremiseArgument) {
		result.expanded = true;
	}
	return result;
});

/*export enum PanelOpenSource {
	"toolbar" = "toolbar",
	"left-panel" = "left-panel",
}
AddSchema("PanelOpenSource", {enum: GetValues(PanelOpenSource)});*/

@MGLClass()
export class MapNodeView {
	constructor(path: string|n, tryUseNodeDataForExpansionFields = true) {
		makeObservable(this);
		//const pathNodes = path ? ToPathNodes(path) : null;
		if (tryUseNodeDataForExpansionFields && path) {
			// if bail occurs, leave the fields as is (this call-stack is not necessarily reactive, so we can't risk having the error bubble-up)
			const defaultExpansionFields = GetDefaultExpansionFieldsForNodeView.CatchBail({}, path);
			this.Extend(defaultExpansionFields);

			// we have to read from the metadata fields directly, to avoid the infinite-recursion issue that can otherwise occur
			/*const GetDefaultExpansionFieldsForNodeView_meta = accessorMetadata.get("GetDefaultExpansionFieldsForNodeView")!;
			const callPlan = GetDefaultExpansionFieldsForNodeView_meta.GetCallPlan(defaultGraphOptions.graph, defaultGraphOptions.graph.rootStore, false, null, [nodeID], true);
			if (callPlan.cachedResult_wrapper != null) {
				const defaultExpansionFields = callPlan.cachedResult_wrapper.get();
				this.Extend(defaultExpansionFields);
			}*/
		}
	}

	// constructor(childLimit?: number) {
	// constructor(childLimit: number) {
	/*constructor() {
		//this.childLimit = State(a=>a.main.initialChildLimit);
		// try to catch cause of odd "MapNodeView.children is undefined" issue hit sometimes
		Assert(this.children != null);
		new Timer(100, ()=>Assert(this.children != null), 1).Start();
	}*/

	@Field({type: "boolean"}, {opt: true})
	@O expanded? = false;

	@Field({type: "boolean"}, {opt: true})
	@O expanded_truth? = false;

	@Field({type: "boolean"}, {opt: true})
	@O expanded_relevance? = false;

	@Field({type: "boolean"}, {opt: true})
	@O expanded_freeform? = false;

	/** True for node which is selected (ie. has its hover-panel locked open). */
	@Field({type: "boolean"}, {opt: true})
	@O selected?: boolean;

	/** True for node whose box is closest to the view center. */
	@Field({type: "boolean"}, {opt: true})
	@O focused?: boolean;

	/** Offset of view-center from self (since we're the focus-node). */
	@Field({$ref: "Vector2"}, {opt: true})
	@O viewOffset?: Vector2;

	@Field({type: "boolean"}, {opt: true})
	@O leftPanelPinned?: boolean;

	@Field({type: "string"}, {opt: true})
	@O openPanel?: string;

	/*@Field({$ref: "PanelOpenSource"}, {opt: true})
	@O openPanel_source?: PanelOpenSource;*/

	@Field({
		$gqlType: "JSON", // currently needed, because get-graphql-from-jsonschema can't handle the "{items: {...}}" structure, and a MapNodeView gql-type is not currently auto-added by postgraphile 
		items: {type: "string"},
	}, {opt: true})
	@O openTermIDs?: string[];

	@Field({patternProperties: {".{22}": {$ref: "MapNodeView"}}})
	// @O children? = observable.map<string, MapNodeView>();
	@O children = {} as {[key: string]: MapNodeView};

	@Field({type: "number"}, {opt: true})
	@O childLimit_up?: number;

	@Field({type: "number"}, {opt: true})
	@O childLimit_down?: number;

	// transient info, for making layout easier
	//@O @ignore renderedChildrenOrder = [] as string[];
	@O @ignore renderedChildrenOrder?: string[]; // can't rely on default-value, because mobx-sync doesn't use it (perhaps because of @ignore flag)
}
export const emptyNodeView = new MapNodeView(null, false);
//RunXOnceSchemasAdded(["Vector2"], ()=>console.log("Should be done...", schemaEntryJSONs.get("MapNodeView")));

// export type MapNodeView_SelfOnly = Omit<MapNodeView, 'children'>;
// export const MapNodeView_SelfOnly_props = ['expanded', 'expanded_truth', 'expanded_relevance', 'selected', 'focused', 'viewOffset', 'openPanel', 'openTermID', 'childLimit_up', 'childLimit_down'];

/*export function NormalizedMapView(mapView: MapView) {
	const result = Clone(mapView);
	return result;
}*/