import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {ForUnlink_GetError, GetNode} from "../../Store/firebase/nodes";
import {GetNodeL2} from "../../Store/firebase/nodes/$node";
import {MapEdit, UserEdit} from "../CommandMacros";

// todo: add full-fledged checking to ensure that nodes are never orphaned by move commands (probably use parents recursion to find at least one map root)

@MapEdit
@UserEdit
export class UnlinkNode extends Command<{mapID: string, parentID: string, childID: string}, {}> {
	allowOrphaning = false; // could also be named "asPartOfCut", to be consistent with ForUnlink_GetError parameter

	parent_oldChildrenOrder: string[];
	Validate() {
		const {parentID, childID} = this.payload;
		this.parent_oldChildrenOrder = GetNode(parentID)?.childrenOrder;

		/* let {parentID, childID} = this.payload;
		let childNode = await GetNodeAsync(childID);
		let parentNodes = await GetNodeParentsAsync(childNode);
		Assert(parentNodes.length > 1, "Cannot unlink this child, as doing so would orphan it. Try deleting it instead."); */
		const oldData = GetNodeL2(childID);
		AssertV(oldData, "oldData was null.");
		const earlyError = ForUnlink_GetError(this.userInfo.id, oldData, this.allowOrphaning);
		AssertV(earlyError == null, earlyError);
	}

	GetDBUpdates() {
		const {parentID, childID} = this.payload;

		const updates = {};
		updates[`nodes/${childID}/.parents/.${parentID}`] = null;
		updates[`nodes/${parentID}/.children/.${childID}`] = null;
		if (this.parent_oldChildrenOrder) {
			updates[`nodes/${parentID}/.childrenOrder`] = this.parent_oldChildrenOrder.Except(childID).IfEmptyThen(null);
		}
		return updates;
	}
}