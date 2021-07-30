import {ArgumentType} from "DB/nodes/@MapNodeRevision.js";
import {AssertValidate, Command, CommandMeta, DBHelper, dbp, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit, UserEdit} from "../CommandMacros.js";
import {AsNodeL1, GetNodeL2} from "../DB/nodes/$node.js";
import {MapNode, MapNodeL2} from "../DB/nodes/@MapNode.js";

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
	oldNodeData: MapNodeL2;
	newNodeData: MapNode;
	Validate() {
		const {nodeID, argumentType} = this.payload;
		this.oldNodeData = GetNodeL2.NN(nodeID);
		this.newNodeData = {...AsNodeL1(this.oldNodeData), argumentType};
		AssertValidate("MapNode", this.newNodeData, "New node-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {nodeID} = this.payload;
		db.set(dbp`nodes/${nodeID}`, this.newNodeData);
	}
}