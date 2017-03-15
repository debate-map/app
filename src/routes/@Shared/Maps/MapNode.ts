import V from "../../../Frame/V/V";
export enum MapNodeType {
	None = 0,
	Category = 1,
	Package = 2,
	Thesis = 3,
	PositiveArgument = 4,
	NegativeArgument = 5,
}
export enum AccessLevel {
	Base = 0,
	Verified = 1,
	Manager = 2,
	Admin = 3,
}

export interface ChildCollection {
	//[key: string]?: boolean;
}
/*export interface ChildInfo {
	id: number;
	type: 
}*/

export interface MapNode {
	_key?: string;
	type: Partial<MapNodeType>;
	title: string;
	agrees: number;
	degree: number;
	disagrees: number;
	weight: number;
	creator: string;
	approved: boolean;
	accessLevel: AccessLevel;
	voteLevel: AccessLevel;
	children: ChildCollection;
	talkChildren: ChildCollection;
}

export class MapNodePath {
	constructor(nodeIDs?: number[]) {
		this.nodeIDs = nodeIDs || [];
	}
	nodeIDs: number[];
	Extend(nodeID: number) {
		return new MapNodePath(this.nodeIDs.concat(nodeID));
	}
}

export class MapView {
	rootNodeID: number;
	rootNodeView = new MapNodeView();
	/*GetViewForPath(path: MapNodePath) {
		var currentNodeView = this.rootNodeView || {children: {}};
		for (let [index, nodeID] of path.nodeIDs.Skip(1).entries()) {
			currentNodeView = currentNodeView.children[nodeID];
			if (currentNodeView == null)
				return null;
		}
		return currentNodeView;
	}
	get SelectedNodeID() {
		let selectedNodeView = V.GetKeyValuePairsInObjTree(this).FirstOrX(a=>a.prop == "selected" && a.value);
		if (selectedNodeView && selectedNodeView.ancestorPairs.Last().prop == "rootNodeView")
			return this.rootNodeID;
		return selectedNodeView ? selectedNodeView.ancestorPairs.Last().prop : null;
	}*/
}
export class MapNodeView {
	selected?: boolean;
	children = {};
}