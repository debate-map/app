import {GetNodeParentsAsync, ForDelete_GetError} from "../../Store/firebase/nodes";
import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {MapNode, ClaimForm, MapNodeL2} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {ToInt} from "js-vextensions";
import {MapEdit, UserEdit} from "../CommandMacros";
import {GetAsync, GetAsync_Raw} from "Frame/Database/DatabaseHelpers";
import {GetMap} from "Store/firebase/maps";
import {GetNodeL2} from "Store/firebase/nodes/$node";
import {MapNodeRevision} from "Store/firebase/nodes/@MapNodeRevision";
import {GetNodeRevisions} from "../../Store/firebase/nodeRevisions";
import {GetMaps} from "../../Store/firebase/maps";

@MapEdit
@UserEdit
export default class DeleteNode extends Command<{mapID: number, nodeID: number, asPartOfMapDelete?: boolean}> {
	oldData: MapNodeL2;
	oldRevisions: MapNodeRevision[];
	oldParentChildrenOrders: number[][];
	viewerIDs_main: number[];
	mapIDs: number[];
	async Prepare() {
		let {mapID, nodeID, asPartOfMapDelete} = this.payload;
		this.oldData = await GetAsync_Raw(()=>GetNodeL2(nodeID));
		this.oldRevisions = await GetAsync(()=>GetNodeRevisions(nodeID));

		this.oldParentChildrenOrders = await Promise.all((this.oldData.parents || {}).VKeys().map(parentID=> {
			return GetDataAsync("nodes", parentID, "childrenOrder") as Promise<number[]>;
		}));

		this.viewerIDs_main = GetDataAsync("nodeViewers", nodeID).VKeys(true).map(ToInt);

		this.mapIDs = await GetAsync(()=>GetMaps().map(a=>a._id));
	}
	async Validate() {
		/*Assert((this.oldData.parents || {}).VKeys(true).length <= 1, "Cannot delete this child, as it has more than one parent. Try unlinking it instead.");
		let normalChildCount = (this.oldData.children || {}).VKeys(true).length;
		Assert(normalChildCount == 0, "Cannot delete this node until all its (non-impact-premise) children have been unlinked or deleted.");*/
		let {mapID} = this.payload;
		let earlyError = await GetAsync(()=>ForDelete_GetError(this.userInfo.id, GetMap(mapID), this.oldData, this.payload.asPartOfMapDelete, this.asSubcommand));
		Assert(earlyError == null, earlyError);
	}

	GetDBUpdates() {
		let {nodeID} = this.payload;
		let updates = {};

		// delete node's own data
		updates[`nodes/${nodeID}`] = null;
		updates[`nodeExtras/${nodeID}`] = null;
		updates[`nodeRatings/${nodeID}`] = null;
		updates[`nodeViewers/${nodeID}`] = null;
		for (let viewerID of this.viewerIDs_main) {
			updates[`userViewedNodes/${viewerID}/${nodeID}}`] = null;
		}

		// delete links with parents
		for (let {index, name: parentID} of (this.oldData.parents || {}).Props()) {
			updates[`nodes/${parentID}/children/${nodeID}`] = null;
			//let parent_childrenOrder = this.oldParentID__childrenOrder[parentID];
			let parent_childrenOrder = this.oldParentChildrenOrders[index];
			if (parent_childrenOrder) {
				updates[`nodes/${parentID}/childrenOrder`] = parent_childrenOrder.Except(nodeID);
			}
		}

		// delete placement in layer
		if (this.oldData.layerPlusAnchorParents) {
			for (let layerPlusAnchorStr in this.oldData.layerPlusAnchorParents) {
				let [layerID, anchorNodeID] = layerPlusAnchorStr.split("_").map(ToInt);
				updates[`layers/${layerID}/nodeSubnodes/${anchorNodeID}/${nodeID}`] = null;
			}
		}

		// delete revisions
		for (let revision of this.oldRevisions) {
			updates[`nodeRevisions/${revision._id}`] = null;
		}

		// delete mapNodeEditTimes
		for (let mapID of this.mapIDs) {
			updates[`mapNodeEditTimes/${mapID}/${nodeID}`] = null;
		}

		return updates;
	}
}