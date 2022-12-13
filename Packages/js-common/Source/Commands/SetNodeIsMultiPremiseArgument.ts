import {Clone} from "web-vcore/nm/js-vextensions.js";
import {AssertValidate, Command, CommandMeta, DBHelper, dbp, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {NodeRevision} from "../DB/nodes/@NodeRevision.js";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetNodeChildren} from "../DB/nodes.js";
import {AsNodeL1, GetNodeDisplayText, GetNodeForm, GetNodeL2, GetNodeL3} from "../DB/nodes/$node.js";
import {NodeL1, NodeL2} from "../DB/nodes/@Node.js";
import {AddNodeRevision} from "./AddNodeRevision.js";

@MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		mapID: {$ref: "UUID"},
		$nodeID: {$ref: "UUID"},
		$multiPremiseArgument: {type: "boolean"},
	}),
})
export class SetNodeIsMultiPremiseArgument extends Command<{mapID?: string, nodeID: string, multiPremiseArgument: boolean}, {}> {
	oldNodeData: NodeL2;
	newNodeData: NodeL1;
	sub_addRevision: AddNodeRevision;
	Validate() {
		const {mapID, nodeID, multiPremiseArgument} = this.payload;
		this.oldNodeData = GetNodeL2.NN(nodeID);

		this.newNodeData = {...AsNodeL1(this.oldNodeData), multiPremiseArgument};
		if (multiPremiseArgument) {
			//this.newNodeData.childrenOrderType = ChildOrderType.Manual;
			//this.newNodeData.childrenOrder = CE(this.oldNodeData.children).VKeys();

			if ((this.oldNodeData.current.phrasing.text_base?.length ?? 0) == 0) {
				const newRevision = Clone(this.oldNodeData.current) as NodeRevision;

				const children = GetNodeChildren(this.oldNodeData.id);
				//const oldChildNode_partialPath = `${nodeID}/${CE(this.oldNodeData.children).VKeys()[0]}`;
				const oldChildNode_partialPath = `${nodeID}/${children[0].id}`;
				const oldChildNode = GetNodeL3.NN(oldChildNode_partialPath);
				newRevision.phrasing.text_base = GetNodeDisplayText(oldChildNode, oldChildNode_partialPath, GetNodeForm(oldChildNode));

				this.IntegrateSubcommand(()=>this.sub_addRevision, null, new AddNodeRevision({mapID, revision: newRevision}));
			}
		} else {
			//this.newNodeData.childrenOrderType = ChildOrderType.ByRating;
			//this.newNodeData.childrenOrder = null;
		}

		AssertValidate("NodeL1", this.newNodeData, "New node-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {nodeID} = this.payload;
		db.set(dbp`nodes/${nodeID}`, this.newNodeData);
		if (this.sub_addRevision) {
			db.add(this.sub_addRevision.GetDBUpdates(db));
		}
	}
}