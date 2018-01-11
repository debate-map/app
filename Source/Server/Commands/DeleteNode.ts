import {GetNodeParentsAsync, ForDelete_GetError} from "../../Store/firebase/nodes";
import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm, MapNodeL2} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {ToInt} from "js-vextensions";
import {MapEdit, UserEdit} from "../CommandMacros";
import {GetAsync, GetAsync_Raw} from "Frame/Database/DatabaseHelpers";
import {GetMap} from "Store/firebase/maps";
import {GetNodeL2} from "Store/firebase/nodes/$node";

@MapEdit
@UserEdit
export default class DeleteNode extends Command<{mapID: number, nodeID: number, asPartOfMapDelete?: boolean}> {
	oldData: MapNodeL2;
	oldParentChildrenOrders: number[][];
	impactPremiseID: number;
	viewerIDs_main: number[];
	viewerIDs_impactPremise: number[];
	async Prepare() {
		let {nodeID} = this.payload;
		this.oldData = await GetAsync_Raw(()=>GetNodeL2(nodeID));

		this.oldParentChildrenOrders = await Promise.all((this.oldData.parents || {}).VKeys().map(parentID=> {
			return GetDataAsync("nodes", parentID, "childrenOrder") as Promise<number[]>;
		}));

		// this works, because we only let you delete a node when it has no non-impact-premise children
		this.impactPremiseID = this.oldData.type == MapNodeType.Argument ? this.oldData.children.VKeys()[0].ToInt() : null;

		this.viewerIDs_main = GetDataAsync("nodeViewers", nodeID).VKeys(true).map(ToInt);
		if (this.impactPremiseID) {
			this.viewerIDs_impactPremise = GetDataAsync("nodeViewers", this.impactPremiseID).VKeys(true).map(ToInt);
		}
	}
	async Validate() {
		/*Assert((this.oldData.parents || {}).VKeys(true).length <= 1, "Cannot delete this child, as it has more than one parent. Try unlinking it instead.");
		let normalChildCount = (this.oldData.children || {}).VKeys(true).length;
		if (this.impactPremiseID) normalChildCount--;
		Assert(normalChildCount == 0, "Cannot delete this node until all its (non-impact-premise) children have been unlinked or deleted.");*/
		let {mapID} = this.payload;
		let earlyError = await GetAsync(()=>ForDelete_GetError(this.userInfo.id, GetMap(mapID), this.oldData, this.payload.asPartOfMapDelete));
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

		// if has impact-premise, delete it also
		if (this.impactPremiseID) {
			updates[`nodes/${this.impactPremiseID}`] = null;
			updates[`nodeExtras/${this.impactPremiseID}`] = null;
			updates[`nodeRatings/${this.impactPremiseID}`] = null;
			updates[`nodeViewers/${this.impactPremiseID}`] = null;
			for (let viewerID of this.viewerIDs_impactPremise) {
				updates[`userViewedNodes/${viewerID}/${this.impactPremiseID}}`] = null;
			}
		}

		return updates;
	}
}