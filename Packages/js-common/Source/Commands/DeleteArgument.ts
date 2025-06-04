import {Command, CommandMeta, DBHelper, SimpleSchema} from "mobx-graphlink";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {DeleteNode} from "./DeleteNode.js";
import {UnlinkNode} from "./UnlinkNode.js";

@MapEdit
@UserEdit
@CommandMeta({
	inputSchema: ()=>SimpleSchema({
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
		const {mapID, argumentID, claimID, deleteClaim} = this.input;

		if (deleteClaim) {
			this.IntegrateSubcommand(()=>this.sub_deleteClaim, null, ()=>new DeleteNode({mapID, nodeID: claimID}));
		} else {
			this.IntegrateSubcommand(()=>this.sub_unlinkClaim, null, ()=>new UnlinkNode({mapID, parentID: argumentID, childID: claimID}));
		}

		this.IntegrateSubcommand(()=>this.sub_deleteContainerArgument, null, ()=>new DeleteNode({mapID, nodeID: argumentID}), a=>a.childrenToIgnore = [claimID]);
	}

	DeclareDBUpdates(db: DBHelper) {
		if (this.sub_deleteClaim) db.add(this.sub_deleteClaim.GetDBUpdates(db));
		if (this.sub_unlinkClaim) db.add(this.sub_unlinkClaim.GetDBUpdates(db));
		db.add(this.sub_deleteContainerArgument.GetDBUpdates(db));
	}
}