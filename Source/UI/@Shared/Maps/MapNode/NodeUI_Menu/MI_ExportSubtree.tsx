import {BaseComponentPlus} from "react-vextensions";
import {Observer} from "vwebapp-framework";
import {MapNodeL3} from "Store/firebase/nodes/@MapNode";
import {MI_SharedProps} from "../NodeUI_Menu";

@Observer
export class MI_ExportSubtree extends BaseComponentPlus({} as MI_SharedProps, {}) {
	render() {
		const {} = this.props;
		return null;
	}
}

// console-based version for old site
// ==========

// not perfect match for old-site, data, but better than nothing
export type SubtreeExportData_Old = MapNodeL3 & {childrenData: {[key: string]: SubtreeExportData_Old}};

/*
==========
function GetSubtree(path) {
	let pathSegments = path.split("/");
	let nodeL3 = RR.GetNodeL3(path);
	let result = RR.Clone(nodeL3);
	result.childrenData = {};
	for (let child of RR.GetNodeChildrenL3(nodeL3, path)) {
		if (child == null) continue; // not yet loaded
		if (pathSegments.Contains(child._id)) continue; // avoid loops
		result.childrenData[child._id] = GetSubtree(`${path}/${child._id}`);
	}
	return result;
}
async function LogSelectedSubtree() {
	let state = store.getState();
	let selectedPath = RR.GetSelectedNodePath(state.main[state.main.page].selectedMapID);
	let subtree = await GetAsync(()=>GetSubtree(selectedPath));
	console.log(ToJSON(subtree));
}

// usage
LogSelectedSubtree();
==========
*/