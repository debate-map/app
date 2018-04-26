import {GetAsync, GetAsync_Raw} from "Frame/Database/DatabaseHelpers";
import {GetNodeL2} from "Store/firebase/nodes/$node";
import {MapNodeRevision} from "Store/firebase/nodes/@MapNodeRevision";
import {Assert, ToInt} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {GetMaps} from "../../Store/firebase/maps";
import {GetNodeRevisions} from "../../Store/firebase/nodeRevisions";
import {ForDelete_GetError} from "../../Store/firebase/nodes";
import {MapNodeL2} from "../../Store/firebase/nodes/@MapNode";
import {Command, MergeDBUpdates} from "../Command";
import {MapEdit, UserEdit} from "../CommandMacros";
import {GetNodeViewers} from "../../Store/firebase/nodeViewers";

@MapEdit
@UserEdit
export default class DeleteNode extends Command<{mapID?: number, nodeID: number, withContainerArgument?: number, asPartOfMapDelete?: boolean}> {
	sub_deleteContainerArgument: DeleteNode;
	
	oldData: MapNodeL2;
	oldRevisions: MapNodeRevision[];
	oldParentChildrenOrders: number[][];
	viewerIDs_main: string[];
	mapIDs: number[];
	async Prepare() {
		let {mapID, nodeID, withContainerArgument, asPartOfMapDelete} = this.payload;
		this.oldData = await GetAsync_Raw(()=>GetNodeL2(nodeID));
		this.oldRevisions = await GetAsync(()=>GetNodeRevisions(nodeID));

		this.oldParentChildrenOrders = await Promise.all((this.oldData.parents || {}).VKeys().map(parentID=> {
			return GetDataAsync("nodes", parentID, "childrenOrder") as Promise<number[]>;
		}));

		this.viewerIDs_main = await GetAsync(()=>GetNodeViewers(nodeID));

		this.mapIDs = await GetAsync(()=>GetMaps().map(a=>a._id));

		if (withContainerArgument) {
			this.sub_deleteContainerArgument = new DeleteNode({mapID, nodeID: withContainerArgument});
			this.sub_deleteContainerArgument.Validate_Early();
			await this.sub_deleteContainerArgument.Prepare();
		}
	}
	async Validate() {
		/*Assert((this.oldData.parents || {}).VKeys(true).length <= 1, "Cannot delete this child, as it has more than one parent. Try unlinking it instead.");
		let normalChildCount = (this.oldData.children || {}).VKeys(true).length;
		Assert(normalChildCount == 0, "Cannot delete this node until all its (non-impact-premise) children have been unlinked or deleted.");*/
		let earlyError = await GetAsync(()=>ForDelete_GetError(this.userInfo.id, this.oldData, this.payload.asPartOfMapDelete, this.asSubcommand));
		Assert(earlyError == null, earlyError);
		if (this.sub_deleteContainerArgument) await this.sub_deleteContainerArgument.Validate();
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

		// delete edit-time entry within each map (if it exists)
		for (let mapID of this.mapIDs) {
			updates[`mapNodeEditTimes/${mapID}/${nodeID}`] = null;
		}

		if (this.sub_deleteContainerArgument) {
			updates = MergeDBUpdates(updates, this.sub_deleteContainerArgument.GetDBUpdates());
		}

		return updates;
	}
}