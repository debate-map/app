import {GetNodeL3, ChildOrdering, MapView, NodeL3, GetPathNodeIDs, Map, ChildLayout, GetChildLayout_Final, NodeType} from "dm_common";
import {makeObservable, observable} from "web-vcore/nm/mobx.js";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {ignore, version} from "web-vcore/nm/mobx-sync.js";
import {store} from "Store";
import {O, StoreAction} from "web-vcore";
import {Assert, CreateStringEnum, GetEntries, GetPercentFromXToY} from "web-vcore/nm/js-vextensions.js";
import {DataExchangeFormat, ImportResource} from "Utils/DataFormats/DataExchangeFormat.js";
import {MapState} from "./maps/mapStates/@MapState.js";
import {GetMapView, GetNodeView} from "./maps/mapViews/$mapView.js";

export enum RatingPreviewType {
	none = "none",
	bar_average = "bar_average",
	//bar_median = "bar_median",
	chart = "chart",
}

export class MapsState {
	constructor() { makeObservable(this); }
	// @Oervable maps = observable.map<string, MapState>();
	// @ref(MapState_) maps = {} as {[key: string]: MapState};
	// @map(MapState_) maps = observable.map<string, MapState>();
	// @O maps = {} as ObservableMap<string, MapState>;
	@O @version(2) mapStates = observable.map<string, MapState>();
	/* ACTEnsureMapStateInit(mapID: string) {
		if (this.maps.get(mapID)) return;
		this.maps.set(mapID, new MapState());
	} */
	@O @version(2) mapViews = observable.map<string, MapView>();

	@O nodeLastAcknowledgementTimes = observable.map<string, number>();
	@O @ignore currentNodeBeingAdded_path: string|n;

	// openMap: number;

	@O copiedNodePath: string|n;
	@O copiedNodePath_asCut: boolean;

	@O lockMapScrolling = true;
	@O initialChildLimit = 5;
	@O childOrdering?: ChildOrdering;
	@O showReasonScoreValues = false;
	@O autoExpandNewNodes = true;
	@O showCloneHistoryButtons = false;
	@O toolbarRatingPreviews = RatingPreviewType.chart;
	@O @ignore forcedExpand = false;
	@O forcedExpand_depth = 1;
	@O @ignore screenshotMode = false;
	//@O nodeLeftBoxEnabled = false;
	// needs cleanup/formalization to be recommendable, but needed atm for some SL use-cases
	@O @version(2) nodeStyleRules = [] as NodeStyleRule[];

	// node panels
	@O detailsPanel = new DetailsPanelState();
	@O tagsPanel = new TagsPanelState();
	@O addChildDialog = new AddChildDialogState();
	@O importSubtreeDialog = new ImportSubtreeDialogState();
	@O exportSubtreeDialog = new ExportSubtreeDialogState();
}

export class NodeStyleRule {
	constructor(data?: Partial<NodeStyleRule>) {
		makeObservable(this);
		Object.assign(this, data);
	}

	@O enabled = true;

	@O ifType: NodeStyleRule_IfType;
	@O.ref if_lastEditorIs: NodeStyleRuleComp_LastEditorIs;
	@O.ref if_accessPolicyDoesNotMatch: NodeStyleRuleComp_AccessPolicyDoesNotMatch;

	@O thenType: NodeStyleRule_ThenType;
	@O then_setBackgroundColor: NodeStyleRuleComp_SetBackgroundColor;

	// need Partial<NodeL3>, since can be called from GetNodeColor
	DoesIfCheckPass(node: Partial<NodeL3>) {
		if (this.ifType == NodeStyleRule_IfType.lastEditorIs) {
			return node.current?.creator != null && node.current?.creator == this.if_lastEditorIs.user;
		}
		if (this.ifType == NodeStyleRule_IfType.accessPolicyDoesNotMatch) {
			return node.accessPolicy && !this.if_accessPolicyDoesNotMatch.policyIDs.includes(node.accessPolicy);
		}
		Assert(false, `Invalid if-type for style-rule:${this.ifType}`);
	}
}

export enum NodeStyleRule_IfType {
	"lastEditorIs" = "lastEditorIs",
	"accessPolicyDoesNotMatch" = "accessPolicyDoesNotMatch",
}
export const NodeStyleRule_IfType_displayTexts = {
	[NodeStyleRule_IfType.lastEditorIs]: "node's last editor is",
	[NodeStyleRule_IfType.accessPolicyDoesNotMatch]: "node's access-policy does not match",
};
export class NodeStyleRuleComp_LastEditorIs {
	user: string;
}
export class NodeStyleRuleComp_AccessPolicyDoesNotMatch {
	policyIDs: (string|null)[] = [];
}

export enum NodeStyleRule_ThenType {
	"setBackgroundColor" = "setBackgroundColor",
}
export const NodeStyleRule_ThenType_displayTexts = {
	[NodeStyleRule_ThenType.setBackgroundColor]: "set node's background color to",
};
export class NodeStyleRuleComp_SetBackgroundColor {
	color: string;
}

export enum DetailsPanel_Subpanel {
	text = "text",
	attachments = "attachments",
	permissions = "permissions",
	others = "others",
}
export class DetailsPanelState {
	constructor() { makeObservable(this); }
	@O subpanel = DetailsPanel_Subpanel.text;
}

export enum TagsPanel_Subpanel {
	"basic" = "basic",
	"advanced" = "advanced",
}
export class TagsPanelState {
	constructor() { makeObservable(this); }
	@O subpanel = TagsPanel_Subpanel.basic;
}

export class AddChildDialogState {
	constructor() { makeObservable(this); }
	@O advanced = false;
}

export class ImportSubtreeDialogState {
	constructor() { makeObservable(this); }

	@O sourceType = DataExchangeFormat.csv_sl;
	@O autoSearchByTitle = true;
	@O showAutoInsertTools = true;
	@O autoInsert_interval = 1000;
	//@O hideFoundEntries = false;

	@O @ignore selectedImportResources = new Set<ImportResource>();
	@O @ignore selectFromIndex = -1;

	/*@O importRatings = false;
	@O importRatings_userIDsStr = "";*/
}

export enum ExportRetrievalMethod {
	"server" = "server",
	"client" = "client",
}
export class ExportSubtreeDialogState {
	constructor() { makeObservable(this); }
	@O retrievalMethod = ExportRetrievalMethod.server;
	@O maxExportDepth = 5;
	@O @version(2) targetFormat = DataExchangeFormat.json_dm;
}

export const GetLastAcknowledgementTime = CreateAccessor(function(nodeID: string) {
	return this!.store.main.maps.nodeLastAcknowledgementTimes.get(nodeID) || 0;
});

/* export const GetLastAcknowledgementTime2 = StoreAccessor((nodeID: string) => {
	GetCopiedNodePath();
	return State('main', 'nodeLastAcknowledgementTimes', nodeID) as number || 0;
}); */

export const GetCopiedNodePath = CreateAccessor(function() {
	return this!.store.main.maps.copiedNodePath;
});
export const GetCopiedNode = CreateAccessor(()=>{
	const path = GetCopiedNodePath();
	if (!path) return null;
	return GetNodeL3(path);
});

const idChars = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".split("");
export const UseForcedExpandForPath = CreateAccessor((path: string, forLayoutHelperMap: boolean)=>{
	const nodeIDsInPath = GetPathNodeIDs(path);
	const pathHasCycle = nodeIDsInPath.Distinct().length != nodeIDsInPath.length;
	if (pathHasCycle) return false; // never force-expand a path that has a cycle

	if (forLayoutHelperMap) return true;
	const uiState = store.main.maps;
	if (uiState.forcedExpand) {
		const pathNodeIDs = GetPathNodeIDs(path);
		const depth = pathNodeIDs.length;

		// if we haven't reached the "layer" of the target/expand-to depth yet, then force-expand
		// (we use "<" rather than "<=", because "force expanding" the node at depth X-1 is sufficient to "reach" displaying of all nodes at target depth X)
		if (depth < uiState.forcedExpand_depth.FloorTo(1)) return true;

		// if instead we've reached the correct layer, then use the "fractional depth" of this node (based on id's first-char) to determine whether we force-expand this node
		if (uiState.forcedExpand_depth != uiState.forcedExpand_depth.FloorTo(1)) {
			const nodeID = nodeIDsInPath.Last();
			const fractionalPosition = idChars.indexOf(nodeID[0]) / (idChars.length - 1);
			const fractionalLimit = uiState.forcedExpand_depth - uiState.forcedExpand_depth.FloorTo(1);
			if (fractionalPosition < fractionalLimit) return true;
		}
	}
	return false;
});

export class ChildLimitInfo {
	constructor(data: Partial<ChildLimitInfo>) { Object.assign(this, data); }

	direction: "up" | "down";
	adjustDelta: number;

	showTarget_initial: number;
	showTarget_min: number;
	/** Generally this equals the number of children that actually exist at this location atm -- but can be higher, if "show all children" is active here. */
	showTarget_max: number;
	/** ie. the number of children that are "trying to be shown" currently */
	showTarget_actual: number;

	childCount: number;
	childCountShowing: number;

	ShowMore_NewLimit() {
		return (this.showTarget_actual + this.adjustDelta).KeepBetween(this.showTarget_min, this.showTarget_max);
	}
	ShowLess_NewLimit() {
		return (this.showTarget_actual - this.adjustDelta).KeepBetween(this.showTarget_min, this.showTarget_max);
	}

	HaveShowMoreButtonEnabled() {
		//return this.childCountTryingToShow < this.showLimit_max && this.childrenActuallyShowing < this.showLimit_max;
		return this.ShowMore_NewLimit() != this.showTarget_actual;
	}
	HaveShowLessButtonEnabled() {
		//return this.childCountTryingToShow > this.showLimit_min && this.childrenActuallyShowing > this.showLimit_min;
		return this.ShowLess_NewLimit() != this.showTarget_actual;
	}

	ShouldLimitBarShow() {
		return this.HaveShowMoreButtonEnabled() || this.HaveShowLessButtonEnabled();
	}
}
export const GetChildLimitInfoAtLocation = CreateAccessor(function(map: Map, forLayoutHelperMap: boolean, parentNode: NodeL3, parentPath: string, direction: "up" | "down", childCount: number): ChildLimitInfo {
	// if the map's root node, show all children
	const showAll_regular = parentNode.id == map.rootNode; //|| parentNode.type == NodeType.argument;
	const showAll_forForcedExpand = UseForcedExpandForPath(parentPath, forLayoutHelperMap);
	const showAll = showAll_regular || showAll_forForcedExpand;

	const parentNodeView = GetNodeView(map.id, parentPath);
	const childLayout = GetChildLayout_Final(parentNode.current, map);
	const adjustDelta = childLayout == ChildLayout.slStandard && parentNode.type == NodeType.argument ? 5 : 3;

	let showTarget_initial = this!.store.main.maps.initialChildLimit;
	if (parentNode.type == NodeType.argument && childCount > 1) {
		// in sl-layout, multi-premise args are wanted to start out showing no children (requiring click on child-limit expand button to see premises); in regular dm-layout, they start showing first 2 premises
		showTarget_initial = childLayout == ChildLayout.slStandard ? 0 : 2;
	}
	const showTarget_min = showAll ? 1_000_000 : showTarget_initial.KeepAtMost(childCount); // we can't have the target-min be greater than the actual child-count (else messes up display logic)
	const showTarget_max = showAll ? 1_000_000 : childCount;

	const showLimit_actual = (showAll ? 1_000_000 : null) ?? (parentNodeView?.[`childLimit_${direction}`] ?? showTarget_initial).KeepBetween(showTarget_min, showTarget_max);
	const childCountShowing = showLimit_actual.KeepAtMost(childCount);
	return new ChildLimitInfo({direction, adjustDelta, showTarget_initial, showTarget_min, showTarget_max, showTarget_actual: showLimit_actual, childCount, childCountShowing});
});

// actions
// ==========

export const ACTEnsureMapStateInit = StoreAction((mapID: string)=>{
	if (!store.main.maps.mapStates.has(mapID)) {
		store.main.maps.mapStates.set(mapID, new MapState());
	}
	if (GetMapView(mapID) == null) {
		store.main.maps.mapViews.set(mapID, new MapView());
		store.main.maps.mapViews.get(mapID)!.rootNodeViews = {}; // for some reason this is needed
	}
	return {
		mapState: store.main.maps.mapStates.get(mapID),
		mapView: GetMapView(mapID),
	};
});

// the broadcast-channel allows us to easily replicate the node-copy operation in other tabs, enabling easy copy-paste between tabs
var ACTCopyNode_broadcastChannel = g.BroadcastChannel != null ? new BroadcastChannel("ACTCopyNode_broadcastChannel") : null;
if (ACTCopyNode_broadcastChannel) {
	ACTCopyNode_broadcastChannel.onmessage = (ev: MessageEvent)=>{
		const {path, asCut} = ev.data as {path: string, asCut: boolean};
		ACTCopyNode(path, asCut, false);
	};
}
export const ACTCopyNode = StoreAction((path: string|n, asCut: boolean, broadcastToOtherTabs = true)=>{
	store.main.maps.copiedNodePath = path;
	store.main.maps.copiedNodePath_asCut = asCut;
	if (broadcastToOtherTabs && ACTCopyNode_broadcastChannel) {
		ACTCopyNode_broadcastChannel.postMessage({path, asCut});
	}
});