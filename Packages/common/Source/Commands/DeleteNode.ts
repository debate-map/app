import {AddSchema, AssertV, AssertValidate, Command, MergeDBUpdates, WrapDBValue} from "web-vcore/nm/mobx-graphlink";
import {MapEdit, UserEdit} from "../CommandMacros";
import {MapNodeL2} from "../Store/db/nodes/@MapNode";
import {MapNodeRevision} from "../Store/db/nodes/@MapNodeRevision";
import {GetNodeL2} from "../Store/db/nodes/$node";
import {GetNodeRevisions} from "../Store/db/nodeRevisions";
import {GetNode, ForDelete_GetError} from "../Store/db/nodes";
import {GetMaps} from "../Store/db/maps";
import {CE} from "web-vcore/nm/js-vextensions";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts";
import {AddMap} from "./AddMap";

AddSchema("DeleteNode_payload", {
	properties: {
		mapID: {type: "string"},
		nodeID: {type: "string"},
		withContainerArgument: {type: "string"},
	},
	required: ["nodeID"],
});

@MapEdit
@UserEdit
export class DeleteNode extends Command<{mapID?: string, nodeID: string, withContainerArgument?: string}, {}> {
	// as subcommand
	asPartOfMapDelete = false;
	parentsToIgnore = [] as string[];
	childrenToIgnore = [] as string[];

	sub_deleteContainerArgument: DeleteNode;

	oldData: MapNodeL2;
	oldRevisions: MapNodeRevision[];
	oldParentChildrenOrders: string[][];
	// viewerIDs_main: string[];
	mapIDs: string[];
	Validate() {
		AssertValidate("DeleteNode_payload", this.payload, "Payload invalid");
		const {mapID, nodeID, withContainerArgument} = this.payload;
		const {asPartOfMapDelete, parentsToIgnore, childrenToIgnore} = this;

		this.oldData = GetNodeL2(nodeID);
		AssertUserCanDelete(this, this.oldData);
		// this.oldRevisions = await GetAsync(() => GetNodeRevisions(nodeID));
		// this.oldRevisions = await Promise.all(...oldRevisionIDs.map(id => GetDataAsync('nodeRevisions', id)));
		// this.oldRevisions = await Promise.all(...oldRevisionIDs.map(id => GetAsync(() => GetNodeRevision(id))));
		/* const oldRevisionIDs = await GetNodeRevisionIDsForNode_OneTime(nodeID);
		this.oldRevisions = await GetAsync(() => oldRevisionIDs.map(id => GetNodeRevision(id))); */
		this.oldRevisions = GetNodeRevisions(nodeID);
		AssertV(this.oldRevisions.every(a=>a != null) && this.oldRevisions.length, "oldRevisions has null entries, or length of zero.");

		const parentIDs = CE(this.oldData.parents || {}).VKeys();
		this.oldParentChildrenOrders = parentIDs.map(parentID=>GetNode(parentID)?.childrenOrder);
		// AssertV(this.oldParentChildrenOrders.All((a) => a != null), 'oldParentChildrenOrders has null entries.');

		// this.viewerIDs_main = await GetAsync(() => GetNodeViewers(nodeID));

		const maps = GetMaps();
		this.mapIDs = maps?.map(a=>a?._key);
		AssertV(this.mapIDs && this.mapIDs.every(a=>a != null), "mapIDs is null, or has null entries.");

		// probably todo: integrate this into the command Validate functions themselves
		/* Assert((this.oldData.parents || {}).VKeys().length <= 1, "Cannot delete this child, as it has more than one parent. Try unlinking it instead.");
		let normalChildCount = (this.oldData.children || {}).VKeys().length;
		Assert(normalChildCount == 0, "Cannot delete this node until all its (non-impact-premise) children have been unlinked or deleted."); */
		const earlyError = ForDelete_GetError(this.userInfo.id, this.oldData, this.parentCommand && {asPartOfMapDelete, parentsToIgnore, childrenToIgnore});
		AssertV(earlyError == null, earlyError);

		if (withContainerArgument) {
			this.sub_deleteContainerArgument = this.sub_deleteContainerArgument ?? new DeleteNode({mapID, nodeID: withContainerArgument}).MarkAsSubcommand(this);
			this.sub_deleteContainerArgument.childrenToIgnore = [nodeID];
			// this.sub_deleteContainerArgument.Validate_Early();
			this.sub_deleteContainerArgument.Validate();
		}
	}

	GetDBUpdates() {
		const {nodeID} = this.payload;
		let updates = {};

		// delete node's own data
		updates[`nodes/${nodeID}`] = null;
		// updates[`nodeExtras/${nodeID}`] = null;
		updates[`nodeRatings/${nodeID}`] = null;
		updates[`nodeViewers/${nodeID}`] = null;
		/* for (const viewerID of this.viewerIDs_main) {
			updates[`userViewedNodes/${viewerID}/.${nodeID}}`] = null;
		} */

		// delete links with parents
		for (const {index, key: parentID} of CE(this.oldData.parents || {}).Pairs()) {
			updates[`nodes/${parentID}/.children/.${nodeID}`] = null;
			// let parent_childrenOrder = this.oldParentID__childrenOrder[parentID];
			const parent_childrenOrder = this.oldParentChildrenOrders[index];
			if (parent_childrenOrder) {
				//updates[`nodes/${parentID}/.childrenOrder`] = CE(CE(parent_childrenOrder).Except(nodeID)).IfEmptyThen(null);
				updates[`nodes/${parentID}/.childrenOrder`] = CE(parent_childrenOrder).Except(nodeID);
			}
		}

		// delete placement in layer
		/*if (this.oldData.layerPlusAnchorParents) {
			for (const layerPlusAnchorStr of CE(this.oldData.layerPlusAnchorParents).VKeys()) {
				const [layerID, anchorNodeID] = layerPlusAnchorStr.split("+");
				updates[`layers/${layerID}/.nodeSubnodes/.${anchorNodeID}/.${nodeID}`] = null;
			}
		}*/

		// delete revisions
		for (const revision of this.oldRevisions) {
			updates[`nodeRevisions/${revision._key}`] = null;
		}

		// delete edit-time entry within each map (if it exists)
		for (const mapID of this.mapIDs) {
			updates[`mapNodeEditTimes/${mapID}/.${nodeID}`] = WrapDBValue(null, {merge: true});
		}

		if (this.sub_deleteContainerArgument) {
			updates = MergeDBUpdates(updates, this.sub_deleteContainerArgument.GetDBUpdates());
		}

		// todo: we also need to delete ourselves from our children's "parents" prop! (for when you can delete nodes with children)

		return updates;
	}
}