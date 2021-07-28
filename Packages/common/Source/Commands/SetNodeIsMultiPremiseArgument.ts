import {Clone} from "web-vcore/nm/js-vextensions.js";
import {AssertValidate, Command, CommandMeta, DBHelper, dbp} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit, UserEdit} from "../CommandMacros.js";
import {GetNodeChildren} from "../DB/nodes.js";
import {AsNodeL1, GetNodeDisplayText, GetNodeForm, GetNodeL2, GetNodeL3} from "../DB/nodes/$node.js";
import {MapNode, MapNodeL2} from "../DB/nodes/@MapNode.js";
import {AddNodeRevision} from "./AddNodeRevision.js";

@MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>({
		properties: {
			mapID: {type: "string"},
			nodeID: {type: "string"},
			multiPremiseArgument: {type: "boolean"},
		},
		required: ["nodeID", "multiPremiseArgument"],
	}),
})
export class SetNodeIsMultiPremiseArgument extends Command<{mapID?: string, nodeID: string, multiPremiseArgument: boolean}, {}> {
	oldNodeData: MapNodeL2;
	newNodeData: MapNode;
	sub_addRevision: AddNodeRevision;
	Validate() {
		const {mapID, nodeID, multiPremiseArgument} = this.payload;
		this.oldNodeData = GetNodeL2.NN(nodeID);

		this.newNodeData = {...AsNodeL1(this.oldNodeData), ...{multiPremiseArgument}};
		if (multiPremiseArgument) {
			//this.newNodeData.childrenOrderType = ChildOrderType.Manual;
			//this.newNodeData.childrenOrder = CE(this.oldNodeData.children).VKeys();

			if ((this.oldNodeData.current.titles.base?.length ?? 0) == 0) {
				const newRevision = Clone(this.oldNodeData.current);

				const children = GetNodeChildren(this.oldNodeData.id);
				//const oldChildNode_partialPath = `${nodeID}/${CE(this.oldNodeData.children).VKeys()[0]}`;
				const oldChildNode_partialPath = `${nodeID}/${children[0].id}`;
				const oldChildNode = GetNodeL3.NN(oldChildNode_partialPath);
				newRevision.titles.base = GetNodeDisplayText(oldChildNode, oldChildNode_partialPath, GetNodeForm(oldChildNode));

				this.sub_addRevision = new AddNodeRevision({mapID, revision: newRevision}).MarkAsSubcommand(this);
				this.sub_addRevision.Validate();
			}
		} else {
			//this.newNodeData.childrenOrderType = ChildOrderType.ByRating;
			//this.newNodeData.childrenOrder = null;
		}

		AssertValidate("MapNode", this.newNodeData, "New node-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {nodeID} = this.payload;
		db.set(dbp`nodes/${nodeID}`, this.newNodeData);
		if (this.sub_addRevision) {
			db.add(this.sub_addRevision.GetDBUpdates());
		}
	}
}