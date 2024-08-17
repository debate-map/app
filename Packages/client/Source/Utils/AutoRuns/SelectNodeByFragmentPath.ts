import {GetMap, GetNode, GetNodeLinks} from "dm_common";
import {store} from "Store";
import {ACTNodeSelect} from "Store/main/maps/mapViews/$mapView.js";
import {JumpToNode} from "UI/@Shared/NavBar/SearchPanel.js";
import {AddNotificationMessage} from "web-vcore";
import {Assert, AssertWarn} from "js-vextensions";
import {GetAsync} from "mobx-graphlink";
import {AutoRun_HandleBail} from "./@Helpers.js";

let selectNode_fragmentPath_last;
AutoRun_HandleBail(()=>{
	const nodePath = store.main.selectNode_fragmentPath;
	if (nodePath != selectNode_fragmentPath_last) {
		selectNode_fragmentPath_last = nodePath;
		if (nodePath) {
			const [mapID, ...nodePathFragments] = nodePath.split("/");
			SelectNodeByFragmentPath(mapID, nodePathFragments);
		}
	}
}, {name: "SelectNodeByFragmentPath"});

/**
 * Takes a "fragment path" (ie. a node-path, but with some segments just being the start of a node-id, rather than the full-id), resolves the path to its full form, then selects and scrolls to the final node.
 */
async function SelectNodeByFragmentPath(mapID: string, nodePathFragments: string[]) {
	const nodeIDs = [] as string[];
	for (const fragment of nodePathFragments) {
		// first node-id is always the root-node of the map
		if (nodeIDs.length == 0) {
			const map = await GetAsync(()=>GetMap(mapID));
			if (map == null) return;
			const nodeID = map.rootNode;
			if (!nodeID.startsWith(fragment)) {
				/*AddNotificationMessage(`Map's root-node id (${map.rootNode}) does not match/start-with the fragment in the url (${fragment}).`);
				return;*/
				throw new Error(`Map's root-node id (${map.rootNode}) does not match/start-with the fragment in the url (${fragment}).`);
			}
			nodeIDs.push(nodeID);
		} else if (fragment.length == 22) {
			nodeIDs.push(fragment);
		} else {
			const lastNodeID = nodeIDs.Last();
			const lastNode_childLinks = await GetAsync(()=>GetNodeLinks(lastNodeID));
			const childLinkMatchingFragment = lastNode_childLinks.find(a=>a.child.startsWith(fragment));
			if (childLinkMatchingFragment == null) {
				AddNotificationMessage(`Could not find child-node matching the fragment "${fragment}" at the correct position, in order to select the node specified in the url. (map structure was probably just changed)`);
				return;
			}
			nodeIDs.push(childLinkMatchingFragment.child);
		}
	}
	const finalNodePath = nodeIDs.join("/");
	ACTNodeSelect(mapID, finalNodePath);
	JumpToNode(mapID, finalNodePath);
}