import {AssertValidate, Command, CommandMeta, DBHelper, dbp, DeriveJSONSchema, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit, UserEdit} from "../CommandMacros.js";
import {GetNode} from "../DB/nodes.js";
import {MapNode} from "../DB/nodes/@MapNode.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$nodeID: {$ref: "UUID"},
		$accessPolicy: {$ref: "UUID"},
	}),
})
export class UpdateNodeAccessPolicy extends Command<{nodeID: string, accessPolicy: string}, {}> {
	oldNodeData: MapNode;
	newNodeData: MapNode;
	Validate() {
		const {nodeID, accessPolicy} = this.payload;
		const node = this.oldNodeData = GetNode.NN(nodeID);
		AssertUserCanModify(this, this.oldNodeData);

		this.newNodeData = {...this.oldNodeData, accessPolicy};
		AssertValidate("MapNode", this.newNodeData, "New node-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {nodeID} = this.payload;
		db.set(dbp`nodes/${nodeID}`, this.newNodeData);
	}
}