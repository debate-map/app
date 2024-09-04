import {FancyFormat} from "js-vextensions";
import {AssertV, Command, CommandMeta, DBHelper, dbp, SimpleSchema} from "mobx-graphlink";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetNodeLinks} from "../DB/nodeLinks.js";
import {NodeLink} from "../DB/nodeLinks/@NodeLink.js";
import {IsRootNode} from "../DB/nodes.js";
import {GetNodeL2} from "../DB/nodes/$node.js";
import {IsUserCreatorOrMod} from "../DB/users/$user.js";
import {PERMISSIONS} from "../DB.js";

// todo: add full-fledged checking to ensure that nodes are never orphaned by move commands (probably use parents recursion to find at least one map root)

@MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		mapID: {type: "string"},
		parentID: {type: "string"},
		childID: {type: "string"},
	}),
})
export class UnlinkNode extends Command<{mapID: string|n, parentID: string, childID: string}, {}> {
	allowOrphaning = false; // could also be named "asPartOfCut", to be consistent with ForUnlink_GetError parameter

	parentToChildLinks: NodeLink[];
	Validate() {
		const {parentID, childID} = this.payload;
		const childParents = GetNodeLinks(undefined, childID);
		this.parentToChildLinks = GetNodeLinks(parentID, childID);
		AssertV(this.parentToChildLinks.length == 1, FancyFormat({}, `There should be 1 and only 1 link between parent and child. Links:`, this.parentToChildLinks));

		/* let {parentID, childID} = this.payload;
		let childNode = await GetNodeAsync(childID);
		let parentNodes = await GetNodeParentsAsync(childNode);
		Assert(parentNodes.length > 1, "Cannot unlink this child, as doing so would orphan it. Try deleting it instead."); */
		const oldData = GetNodeL2.NN(childID);

		const baseText = `Cannot unlink node #${oldData.id}, since `;
		AssertV(PERMISSIONS.Node.Modify(this.userInfo.id, oldData), `${baseText}you are not its owner. (or a mod)`);
		AssertV(this.allowOrphaning || childParents.length > 1, `${baseText}doing so would orphan it. Try deleting it instead.`);
		AssertV(!IsRootNode(oldData), `${baseText}it's the root-node of a map.`);
		//AssertV(!IsNodeSubnode(oldData), `${baseText}it's a subnode. Try deleting it instead.`);
	}

	DeclareDBUpdates(db: DBHelper) {
		for (const link of this.parentToChildLinks) {
			db.set(dbp`nodeLinks/${link.id}`, null);
		}
	}
}