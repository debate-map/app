import {GetNodeParentsAsync, ForDelete_GetError} from "../../Store/firebase/nodes";
import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {IsArgumentNode} from "../../Store/firebase/nodes/$node";
import {ToInt} from "../../Frame/General/Types";
import {MapEdit, UserEdit} from "../CommandMacros";
import {GetAsync} from "Frame/Database/DatabaseHelpers";
import {GetMap} from "Store/firebase/maps";

@MapEdit
@UserEdit
export default class DeleteNode extends Command<{mapID: number, nodeID: number}> {
	oldData: MapNode;
	oldParentChildrenOrders: number[][];
	metaThesisID: number;
	viewerIDs_main: number[];
	viewerIDs_metaThesis: number[];
	async Prepare() {
		let {nodeID} = this.payload;
		this.oldData = await GetDataAsync({addHelpers: false}, "nodes", nodeID) as MapNode;

		this.oldParentChildrenOrders = await Promise.all((this.oldData.parents || {}).VKeys().map(parentID=> {
			return GetDataAsync("nodes", parentID, "childrenOrder") as Promise<number[]>;
		}));

		// this works, because we only let you delete a node when it has no non-meta-thesis children
		this.metaThesisID = IsArgumentNode(this.oldData) ? this.oldData.children.VKeys()[0].ToInt() : null;

		this.viewerIDs_main = GetDataAsync("nodeViewers", nodeID).VKeys(true).map(ToInt);
		if (this.metaThesisID) {
			this.viewerIDs_metaThesis = GetDataAsync("nodeViewers", this.metaThesisID).VKeys(true).map(ToInt);
		}
	}
	async Validate() {
		/*Assert((this.oldData.parents || {}).VKeys(true).length <= 1, "Cannot delete this child, as it has more than one parent. Try unlinking it instead.");
		let normalChildCount = (this.oldData.children || {}).VKeys(true).length;
		if (this.metaThesisID) normalChildCount--;
		Assert(normalChildCount == 0, "Cannot delete this node until all its (non-meta-thesis) children have been unlinked or deleted.");*/
		let {mapID} = this.payload;
		let earlyError = await GetAsync(()=>ForDelete_GetError(this.userInfo.id, GetMap(mapID), this.oldData));
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

		// if has meta-thesis, delete it also
		if (this.metaThesisID) {
			updates[`nodes/${this.metaThesisID}`] = null;
			updates[`nodeExtras/${this.metaThesisID}`] = null;
			updates[`nodeRatings/${this.metaThesisID}`] = null;
			updates[`nodeViewers/${this.metaThesisID}`] = null;
			for (let viewerID of this.viewerIDs_metaThesis) {
				updates[`userViewedNodes/${viewerID}/${this.metaThesisID}}`] = null;
			}
		}

		return updates;
	}
}