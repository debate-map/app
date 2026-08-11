import {Vector2} from "js-vextensions";
import {CreateAccessor, Field, MGLClass} from "mobx-graphlink";
import {observable} from "mobx";

// this module is in "dm_common", so avoid import from web-vcore (just be careful, since the new @O doesn't warn about classes with missing makeObservable calls)
//import {O} from "web-vcore";
const O = observable;

@MGLClass()
export class MapView {
	// @O rootNodeViews = observable.map<string, NodeView>();
	// use simple object rather than observable-map, since observable-map would lose its prototype on page refresh (when mobx-sync starts loading stored data, this path is not initialized-with-types, since it's nested/non-static)
	// maybe todo: update mobx-sync to at least be able to handle the mobx classes (observable.map, observable.array, etc.)

	//@DB((t, n)=>t.jsonb(n))
	@Field({
		$gqlType: "JSON",
		patternProperties: {".{22}": {$ref: "NodeView"}},
	})
	@O accessor rootNodeViews = {} as {[key: string]: NodeView};

	// client-side only, for when rendering for crawler/bot
	@O accessor bot_currentNodeID: string | undefined;
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
	@O accessor expanded = false;

	/** True for node which is selected (ie. has its hover-panel locked open). */
	@Field({type: "boolean"}, {opt: true})
	@O accessor selected: boolean | undefined;

	/** True for node whose box is closest to the view center. */
	@Field({type: "boolean"}, {opt: true})
	@O accessor viewAnchor: boolean | undefined;

	/** Offset of view-center from self (since we're the focus-node). */
	@Field({$ref: "Vector2"}, {opt: true})
	@O accessor viewOffset: Vector2 | undefined;

	@Field({type: "boolean"}, {opt: true})
	@O accessor leftPanelPinned: boolean | undefined;

	@Field({type: "string"}, {opt: true})
	@O accessor openPanel: string | undefined;

	/*@Field({$ref: "PanelOpenSource"}, {opt: true})
	@O openPanel_source?: PanelOpenSource;*/

	@Field({
		$gqlType: "JSON", // currently needed, because get-graphql-from-jsonschema can't handle the "{items: {...}}" structure, and a NodeView gql-type is not currently auto-added by postgraphile 
		items: {type: "string"},
	}, {opt: true})
	@O accessor openTermIDs: string[] | undefined;

	@Field({patternProperties: {".{22}": {$ref: "NodeView"}}})
	// @O children? = observable.map<string, NodeView>();
	// this field shouldn't ever be null; but given that somehow it is, mark that fact with the TypeScript "?" operator
	//@O children = {} as {[key: string]: NodeView};
	@O accessor children: {[key: string]: NodeView} = {};

	@Field({type: "number"}, {opt: true})
	@O accessor childLimit_up: number | undefined;

	@Field({type: "number"}, {opt: true})
	@O accessor childLimit_down: number | undefined;

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