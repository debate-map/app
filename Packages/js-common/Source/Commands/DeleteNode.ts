import {AssertV, Command, CommandMeta, DBHelper, dbp, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetMapNodeEdits} from "../DB/mapNodeEdits.js";
import {MapNodeEdit} from "../DB/mapNodeEdits/@MapNodeEdit.js";
import {GetNodeChildLinks} from "../DB/nodeChildLinks.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";
import {GetNodePhrasings} from "../DB/nodePhrasings.js";
import {NodePhrasing} from "../DB/nodePhrasings/@NodePhrasing.js";
import {GetRatings} from "../DB/nodeRatings.js";
import {NodeRating} from "../DB/nodeRatings/@NodeRating.js";
import {GetNodeRevisions} from "../DB/nodeRevisions.js";
import {ForDelete_GetError} from "../DB/nodes.js";
import {GetNodeL2} from "../DB/nodes/$node.js";
import {NodeL2} from "../DB/nodes/@Node.js";
import {NodeRevision} from "../DB/nodes/@NodeRevision.js";
import {AssertUserCanDelete} from "./Helpers/SharedAsserts.js";

@MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		mapID: {$ref: "UUID"},
		$nodeID: {$ref: "UUID"},
	}),
})
export class DeleteNode extends Command<{mapID?: string|n, nodeID: string}, {}> {
	// as subcommand
	asPartOfMapDelete = false;
	parentsToIgnore = [] as string[];
	childrenToIgnore = [] as string[];

	sub_deleteContainerArgument: DeleteNode;

	oldData: NodeL2|n;
	oldRevisions: NodeRevision[];
	oldPhrasings: NodePhrasing[];
	oldRatings: NodeRating[];
	//oldParentChildrenOrders: string[][];
	linksAsParent: NodeChildLink[];
	linksAsChild: NodeChildLink[];
	mapNodeEdits: MapNodeEdit[];
	Validate() {
		const {mapID, nodeID} = this.payload;
		const {asPartOfMapDelete, parentsToIgnore, childrenToIgnore} = this;

		this.oldData = GetNodeL2(nodeID);
		AssertUserCanDelete(this, this.oldData);
		//this.oldRevisions = await GetAsync(() => GetNodeRevisions(nodeID));
		//this.oldRevisions = await Promise.all(...oldRevisionIDs.map(id => GetDataAsync('nodeRevisions', id)));
		//this.oldRevisions = await Promise.all(...oldRevisionIDs.map(id => GetAsync(() => GetNodeRevision(id))));
		/*const oldRevisionIDs = await GetNodeRevisionIDsForNode_OneTime(nodeID);
		this.oldRevisions = await GetAsync(() => oldRevisionIDs.map(id => GetNodeRevision(id)));*/
		this.oldRevisions = GetNodeRevisions(nodeID);
		AssertV(this.oldRevisions.every(a=>a != null) && this.oldRevisions.length, "oldRevisions has null entries, or length of zero.");

		this.oldPhrasings = GetNodePhrasings(nodeID);
		this.oldRatings = GetRatings(nodeID);

		/*const parentIDs = CE(this.oldData.parents || {}).VKeys();
		this.oldParentChildrenOrders = parentIDs.map(parentID=>GetNode(parentID)?.childrenOrder);
		//AssertV(this.oldParentChildrenOrders.All((a) => a != null), 'oldParentChildrenOrders has null entries.');*/
		this.linksAsParent = GetNodeChildLinks(nodeID);
		this.linksAsChild = GetNodeChildLinks(null, nodeID);
		this.mapNodeEdits = GetMapNodeEdits(null, nodeID);

		// probably todo: integrate this into the command Validate functions themselves
		/*Assert((this.oldData.parents || {}).VKeys().length <= 1, "Cannot delete this child, as it has more than one parent. Try unlinking it instead.");
		let normalChildCount = (this.oldData.children || {}).VKeys().length;
		Assert(normalChildCount == 0, "Cannot delete this node until all its (non-impact-premise) children have been unlinked or deleted.");*/
		const earlyError = ForDelete_GetError(this.userInfo.id, this.oldData!, this.parentCommand && {asPartOfMapDelete, parentsToIgnore, childrenToIgnore});
		AssertV(earlyError == null, earlyError);
	}

	DeclareDBUpdates(db: DBHelper) {
		const {nodeID} = this.payload;

		for (const phrasing of this.oldPhrasings) {
			db.set(dbp`nodePhrasings/${phrasing.id}`, null);
		}
		for (const rating of this.oldRatings) {
			db.set(dbp`nodeRatings/${rating.id}`, null);
		}

		for (const link of this.linksAsParent) {
			db.set(dbp`nodeChildLinks/${link.id}`, null);
		}
		for (const link of this.linksAsChild) {
			db.set(dbp`nodeChildLinks/${link.id}`, null);
		}
		// delete edit-time entries within each map (where such entries exist)
		for (const edit of this.mapNodeEdits) {
			db.set(dbp`mapNodeEdits/${edit.id}`, null);
		}

		// delete placement in layer
		/*if (this.oldData.layerPlusAnchorParents) {
			for (const layerPlusAnchorStr of CE(this.oldData.layerPlusAnchorParents).VKeys()) {
				const [layerID, anchorNodeID] = layerPlusAnchorStr.split("+");
				db.set(dbp`layers/${layerID}/.nodeSubnodes/.${anchorNodeID}/.${nodeID}`, null);
			}
		}*/

		// delete revisions
		for (const revision of this.oldRevisions) {
			db.set(dbp`nodeRevisions/${revision.id}`, null);
		}

		// todo: delete any tags for which this node is the only associated node

		// delete node's own data last (path of least resistance regarding fk-refs)
		db.set(dbp`nodes/${nodeID}`, null);
	}
}