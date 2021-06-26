import {GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {MapEdit, UserEdit} from "../CommandMacros";
import {GetNode, IsRootNode} from "../Store/db/nodes";
import {GetNodeL2} from "../Store/db/nodes/$node";
import {IsUserCreatorOrMod} from "../Store/db/users/$user";
import {CE} from "web-vcore/nm/js-vextensions";
import {NodeChildLink} from "../Store/db/nodeChildLinks/@NodeChildLink.js";
import {GetNodeChildLinks} from "../Store/db/nodeChildLinks.js";

// todo: add full-fledged checking to ensure that nodes are never orphaned by move commands (probably use parents recursion to find at least one map root)

@MapEdit
@UserEdit
export class UnlinkNode extends Command<{mapID: string, parentID: string, childID: string}, {}> {
	allowOrphaning = false; // could also be named "asPartOfCut", to be consistent with ForUnlink_GetError parameter

	parentToChildLinks: NodeChildLink[];
	Validate() {
		const {parentID, childID} = this.payload;
		const childParents = GetNodeChildLinks(null, childID);
		this.parentToChildLinks = GetNodeChildLinks(parentID, childID);
		AssertV(this.parentToChildLinks.length <= 1, "There should not be more than 1 link between parent and child.");

		/* let {parentID, childID} = this.payload;
		let childNode = await GetNodeAsync(childID);
		let parentNodes = await GetNodeParentsAsync(childNode);
		Assert(parentNodes.length > 1, "Cannot unlink this child, as doing so would orphan it. Try deleting it instead."); */
		const oldData = GetNodeL2(childID);
		AssertV(oldData, "oldData was null.");

		const baseText = `Cannot unlink node #${oldData.id}, since `;
		AssertV(IsUserCreatorOrMod(this.userInfo.id, oldData), `${baseText}you are not its owner. (or a mod)`);
		AssertV(this.allowOrphaning || childParents.length > 1, `${baseText}doing so would orphan it. Try deleting it instead.`);
		AssertV(!IsRootNode(oldData), `${baseText}it's the root-node of a map.`);
		//AssertV(!IsNodeSubnode(oldData), `${baseText}it's a subnode. Try deleting it instead.`);
	}

	GetDBUpdates() {
		const {parentID, childID} = this.payload;

		const updates = {};
		updates[`nodes/${childID}/.parents/.${parentID}`] = null;
		updates[`nodes/${parentID}/.children/.${childID}`] = null;
		if (this.parentToChildLinks.length) {
			//updates[`nodes/${parentID}/.childrenOrder`] = CE(CE(this.parent_oldChildrenOrder).Except(childID)).IfEmptyThen(null);
			updates[`nodeChildLinks/${this.parentToChildLinks[0].id}`] = null;
		}
		return updates;
	}
}