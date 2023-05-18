import {makeObservable, observable} from "web-vcore/nm/mobx.js";
import {Vector2, Clone, GetValues} from "web-vcore/nm/js-vextensions.js";
import {accessorMetadata, AddSchema, CreateAccessor, DB, defaultGraphOptions, Field, MGLClass, RunXOnceSchemasAdded, schemaEntryJSONs} from "web-vcore/nm/mobx-graphlink.js";
import {ignore} from "web-vcore/nm/mobx-sync.js";
import {GetNode, GetNodeID, GetParentNodeID, ToPathNodes} from "../../DB/nodes.js";
import {NodeType} from "../../DB/nodes/@NodeType.js";

// this module is in "dm_common", so avoid import from web-vcore (just be careful, since the new @O doesn't warn about classes with missing makeObservable calls)
//import {O} from "web-vcore";
const O = observable;

@MGLClass()
export class MapView {
	constructor() { makeObservable(this); }

	// @O rootNodeViews = observable.map<string, NodeView>();
	// use simple object rather than observable-map, since observable-map would lose its prototype on page refresh (when mobx-sync starts loading stored data, this path is not initialized-with-types, since it's nested/non-static)
	// maybe todo: update mobx-sync to at least be able to handle the mobx classes (observable.map, observable.array, etc.)

	//@DB((t, n)=>t.jsonb(n))
	@Field({
		$gqlType: "JSON",
		patternProperties: {".{22}": {$ref: "NodeView"}},
	})
	@O rootNodeViews = {} as {[key: string]: NodeView};

	// client-side only, for when rendering for crawler/bot
	@O bot_currentNodeID?: string;
}

export const GetDefaultExpansionFieldsForNodeView = CreateAccessor((path: string)=>{
	/*const nodeID = GetNodeID(path);
	const parentID = GetParentNodeID(path);
	const node = GetNode(nodeID);
	const parentNode = GetNode(parentID);*/

	const result = {expanded: false};
	return result;
});

@MGLClass()
export class NodeView {
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
		// try to catch cause of odd "NodeView.children is undefined" issue hit sometimes
		Assert(this.children != null);
		new Timer(100, ()=>Assert(this.children != null), 1).Start();
	}*/

	@Field({type: "boolean"}, {opt: true})
	@O expanded? = false;

	/** True for node which is selected (ie. has its hover-panel locked open). */
	@Field({type: "boolean"}, {opt: true})
	@O selected?: boolean;

	/** True for node whose box is closest to the view center. */
	@Field({type: "boolean"}, {opt: true})
	@O viewAnchor?: boolean;

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
		$gqlType: "JSON", // currently needed, because get-graphql-from-jsonschema can't handle the "{items: {...}}" structure, and a NodeView gql-type is not currently auto-added by postgraphile 
		items: {type: "string"},
	}, {opt: true})
	@O openTermIDs?: string[];

	@Field({patternProperties: {".{22}": {$ref: "NodeView"}}})
	// @O children? = observable.map<string, NodeView>();
	// this field shouldn't ever be null; but given that somehow it is, mark that fact with the TypeScript "?" operator
	//@O children = {} as {[key: string]: NodeView};
	@O children? = {} as {[key: string]: NodeView};

	@Field({type: "number"}, {opt: true})
	@O childLimit_up?: number;

	@Field({type: "number"}, {opt: true})
	@O childLimit_down?: number;

	// transient info, for making layout easier
	//@O @ignore renderedChildrenOrder = [] as string[];
	//@O @ignore renderedChildrenOrder?: string[]; // can't rely on default-value, because mobx-sync doesn't use it (perhaps because of @ignore flag)
}
export const emptyNodeView = new NodeView(null, false);
//RunXOnceSchemasAdded(["Vector2"], ()=>console.log("Should be done...", schemaEntryJSONs.get("NodeView")));

// export type NodeView_SelfOnly = Omit<NodeView, 'children'>;
// export const NodeView_SelfOnly_props = ['expanded', 'selected', 'focused', 'viewOffset', 'openPanel', 'openTermID', 'childLimit_up', 'childLimit_down'];

/*export function NormalizedMapView(mapView: MapView) {
	const result = Clone(mapView);
	return result;
}*/