import {AddSchema, AssertV, AssertValidate, Command, dbp, WrapDBValue} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit, UserEdit} from "../CommandMacros.js";
import {GetMaps} from "../DB/maps.js";
import {GetNodeChildLinks} from "../DB/nodeChildLinks.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";
import {GetNodeRevisions} from "../DB/nodeRevisions.js";
import {ForDelete_GetError} from "../DB/nodes.js";
import {GetNodeL2} from "../DB/nodes/$node.js";
import {MapNodeL2} from "../DB/nodes/@MapNode.js";
import {MapNodeRevision} from "../DB/nodes/@MapNodeRevision.js";
import {AssertUserCanDelete} from "./Helpers/SharedAsserts.js";

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
export class DeleteNode extends Command<{mapID?: string|n, nodeID: string, withContainerArgument?: string}, {}> {
	// as subcommand
	asPartOfMapDelete = false;
	parentsToIgnore = [] as string[];
	childrenToIgnore = [] as string[];

	sub_deleteContainerArgument: DeleteNode;

	oldData: MapNodeL2|n;
	oldRevisions: MapNodeRevision[];
	//oldParentChildrenOrders: string[][];
	links: NodeChildLink[];
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

		/*const parentIDs = CE(this.oldData.parents || {}).VKeys();
		this.oldParentChildrenOrders = parentIDs.map(parentID=>GetNode(parentID)?.childrenOrder);
		// AssertV(this.oldParentChildrenOrders.All((a) => a != null), 'oldParentChildrenOrders has null entries.');*/
		this.links = GetNodeChildLinks(nodeID, nodeID);

		// this.viewerIDs_main = await GetAsync(() => GetNodeViewers(nodeID));

		const maps = GetMaps();
		this.mapIDs = maps?.map(a=>a?.id);
		AssertV(this.mapIDs && this.mapIDs.every(a=>a != null), "mapIDs is null, or has null entries.");

		// probably todo: integrate this into the command Validate functions themselves
		/* Assert((this.oldData.parents || {}).VKeys().length <= 1, "Cannot delete this child, as it has more than one parent. Try unlinking it instead.");
		let normalChildCount = (this.oldData.children || {}).VKeys().length;
		Assert(normalChildCount == 0, "Cannot delete this node until all its (non-impact-premise) children have been unlinked or deleted."); */
		const earlyError = ForDelete_GetError(this.userInfo.id, this.oldData!, this.parentCommand && {asPartOfMapDelete, parentsToIgnore, childrenToIgnore});
		AssertV(earlyError == null, earlyError);

		if (withContainerArgument) {
			this.sub_deleteContainerArgument = this.sub_deleteContainerArgument ?? new DeleteNode({mapID, nodeID: withContainerArgument}).MarkAsSubcommand(this);
			this.sub_deleteContainerArgument.childrenToIgnore = [nodeID];
			// this.sub_deleteContainerArgument.Validate_Early();
			this.sub_deleteContainerArgument.Validate();
		}
	}

	DeclareDBUpdates(db) {
		const {nodeID} = this.payload;

		// delete node's own data
		db.set(dbp`nodes/${nodeID}`, null);
		//db.set(dbp`nodeExtras/${nodeID}`, null);
		db.set(dbp`nodeRatings/${nodeID}`, null);
		db.set(dbp`nodeViewers/${nodeID}`, null);
		/* for (const viewerID of this.viewerIDs_main) {
			db.set(`userViewedNodes/${viewerID}/.${nodeID}}`, null);
		} */

		// delete links with parents
		/*for (const {index, key: parentID} of CE(this.oldData.parents || {}).Pairs()) {
			db.set(`nodes/${parentID}/.children/.${nodeID}`, null);
			// let parent_childrenOrder = this.oldParentID__childrenOrder[parentID];
			const parent_childrenOrder = this.oldParentChildrenOrders[index];
			if (parent_childrenOrder) {
				//db.set(`nodes/${parentID}/.childrenOrder`, CE(CE(parent_childrenOrder).Except(nodeID)).IfEmptyThen(null));
				db.set(`nodes/${parentID}/.childrenOrder`, CE(parent_childrenOrder).Except(nodeID));
			}
		}*/
		for (const link of this.links) {
			db.set(dbp`nodeChildLinks/${link.id}`, null);
		}

		// delete placement in layer
		/*if (this.oldData.layerPlusAnchorParents) {
			for (const layerPlusAnchorStr of CE(this.oldData.layerPlusAnchorParents).VKeys()) {
				const [layerID, anchorNodeID] = layerPlusAnchorStr.split("+");
				db.set(`layers/${layerID}/.nodeSubnodes/.${anchorNodeID}/.${nodeID}`, null);
			}
		}*/

		// delete revisions
		for (const revision of this.oldRevisions) {
			db.set(dbp`nodeRevisions/${revision.id}`, null);
		}

		// delete edit-time entry within each map (if it exists)
		for (const mapID of this.mapIDs) {
			db.set(dbp`mapNodeEditTimes/${mapID}/.${nodeID}`, WrapDBValue(null, {merge: true}));
		}

		if (this.sub_deleteContainerArgument) {
			db.add(this.sub_deleteContainerArgument.GetDBUpdates());
		}

		// todo: we also need to delete ourselves from our children's "parents" prop! (for when you can delete nodes with children)
	}
}