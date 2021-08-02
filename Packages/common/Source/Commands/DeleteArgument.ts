import {Command, CommandMeta, DBHelper, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit, UserEdit} from "../CommandMacros.js";
import {DeleteNode} from "./DeleteNode.js";
import {UnlinkNode} from "./UnlinkNode.js";

@MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		mapID: {$ref: "UUID"},
		$argumentID: {$ref: "UUID"},
		$claimID: {$ref: "UUID"},
		$deleteClaim: {type: "boolean"},
	}),
})
export class DeleteArgument extends Command<{mapID?: string|n, argumentID: string, claimID: string, deleteClaim: boolean}, {}> {
	sub_deleteClaim: DeleteNode;
	sub_unlinkClaim: UnlinkNode;
	sub_deleteContainerArgument: DeleteNode;

	Validate() {
		const {mapID, argumentID, claimID, deleteClaim} = this.payload;

		if (deleteClaim) {
			this.sub_deleteClaim = this.sub_deleteClaim ?? new DeleteNode({mapID, nodeID: claimID}).MarkAsSubcommand(this);
			this.sub_deleteClaim.Validate();
		} else {
			this.sub_unlinkClaim = this.sub_unlinkClaim ?? new UnlinkNode({mapID, parentID: argumentID, childID: claimID}).MarkAsSubcommand(this);
			this.sub_unlinkClaim.Validate();
		}

		this.sub_deleteContainerArgument = this.sub_deleteContainerArgument ?? new DeleteNode({mapID, nodeID: argumentID}).MarkAsSubcommand(this);
		this.sub_deleteContainerArgument.childrenToIgnore = [claimID];
		this.sub_deleteContainerArgument.Validate();
	}

	DeclareDBUpdates(db: DBHelper) {
		if (this.sub_deleteClaim) db.add(this.sub_deleteClaim.GetDBUpdates(db));
		if (this.sub_unlinkClaim) db.add(this.sub_unlinkClaim.GetDBUpdates(db));
		db.add(this.sub_deleteContainerArgument.GetDBUpdates(db));
	}
}