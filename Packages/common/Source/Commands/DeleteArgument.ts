import {Command, CommandMeta, DBHelper, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
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
			this.IntegrateSubcommand(()=>this.sub_deleteClaim, ()=>new DeleteNode({mapID, nodeID: claimID}));
		} else {
			this.IntegrateSubcommand(()=>this.sub_unlinkClaim, ()=>new UnlinkNode({mapID, parentID: argumentID, childID: claimID}));
		}

		this.IntegrateSubcommand(()=>this.sub_deleteContainerArgument, ()=>new DeleteNode({mapID, nodeID: argumentID}), a=>a.childrenToIgnore = [claimID]);
	}

	DeclareDBUpdates(db: DBHelper) {
		if (this.sub_deleteClaim) db.add(this.sub_deleteClaim.GetDBUpdates(db));
		if (this.sub_unlinkClaim) db.add(this.sub_unlinkClaim.GetDBUpdates(db));
		db.add(this.sub_deleteContainerArgument.GetDBUpdates(db));
	}
}