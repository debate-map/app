import {AssertV, AssertValidate, Command, CommandMeta, DBHelper, dbp, SimpleSchema} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetNode} from "../DB/nodes.js";
import {NodeTag} from "../DB/nodeTags/@NodeTag.js";
import {HasModPermissions} from "../DB/users/$user.js";
import {TransferNodes} from "./TransferNodes.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$tag: {$ref: NodeTag.name},
	}),
	returnSchema: ()=>SimpleSchema({$id: {type: "string"}}),
})
export class AddNodeTag extends Command<{tag: NodeTag}, {id: string}> {
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only moderators can add tags currently.");

		const {tag} = this.payload;

		tag.id = this.GenerateUUID_Once("id");
		tag.creator = this.userInfo.id;
		tag.createdAt = Date.now();
		AssertValidate("NodeTag", tag, "NodeTag invalid");

		for (const [i, nodeID] of tag.nodes.entries()) {
			const isLastNode = i == tag.nodes.length - 1;
			const node =
				(isLastNode ? this.Up(TransferNodes)?.Check(a=>a.transferData[0]?.addTagCommands.includes(this))?.transferData[0].addNodeCommand?.payload.node : null)
				?? (isLastNode ? this.Up(TransferNodes)?.Check(a=>a.transferData[1]?.addTagCommands.includes(this))?.transferData[1].addNodeCommand?.payload.node : null)
				?? GetNode(nodeID);
			AssertV(node, `Node with id ${nodeID} does not exist.`);
		}

		this.returnData = {id: tag.id};
	}

	DeclareDBUpdates(db: DBHelper) {
		const {tag} = this.payload;
		db.set(dbp`nodeTags/${tag.id}`, tag);
	}
}