import {AssertValidate, Command, CommandMeta, DBHelper, dbp, SimpleSchema, AssertV} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetNode} from "../DB/nodes.js";
import {NodeL1} from "../DB/nodes/@Node.js";
import {PERMISSIONS} from "../DB.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$nodeID: {$ref: "UUID"},
		$accessPolicy: {$ref: "UUID"},
	}),
})
export class UpdateNodeAccessPolicy extends Command<{nodeID: string, accessPolicy: string}, {}> {
	oldNodeData: NodeL1;
	newNodeData: NodeL1;
	Validate() {
		const {nodeID, accessPolicy} = this.payload;
		const node = this.oldNodeData = GetNode.NN(nodeID);
		AssertV(PERMISSIONS.Node.Modify(this.userInfo.id, this.oldNodeData));

		this.newNodeData = {...this.oldNodeData, accessPolicy};
		AssertValidate("NodeL1", this.newNodeData, "New node-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {nodeID} = this.payload;
		db.set(dbp`nodes/${nodeID}`, this.newNodeData);
	}
}