import {AssertValidate, Command, CommandMeta, DBHelper, dbp, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {ArgumentType} from "../DB/nodes/@NodeRevision.js";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {AsNodeL1, GetNodeL2} from "../DB/nodes/$node.js";
import {NodeL1, NodeL2} from "../DB/nodes/@Node.js";

@MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		mapID: {$ref: "UUID"},
		$nodeID: {$ref: "UUID"},
		$argumentType: {$ref: "ArgumentType"},
	}),
})
export class SetNodeArgumentType extends Command<{mapID?: string|n, nodeID: string, argumentType: ArgumentType}, {}> {
	oldNodeData: NodeL2;
	newNodeData: NodeL1;
	Validate() {
		const {nodeID, argumentType} = this.payload;
		this.oldNodeData = GetNodeL2.NN(nodeID);
		this.newNodeData = {...AsNodeL1(this.oldNodeData), argumentType};
		AssertValidate("NodeL1", this.newNodeData, "New node-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {nodeID} = this.payload;
		db.set(dbp`nodes/${nodeID}`, this.newNodeData);
	}
}