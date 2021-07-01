import {MapEdit, UserEdit} from "../CommandMacros.js";
import {AddSchema, AssertValidate} from "web-vcore/nm/mobx-graphlink.js";
import {GetAsync, Command, AssertV, MergeDBUpdates} from "web-vcore/nm/mobx-graphlink.js";
import {Clone, CE} from "web-vcore/nm/js-vextensions.js";
import {AddNodeRevision} from "./AddNodeRevision.js";
import {MapNodeL2, MapNode} from "../DB/nodes/@MapNode.js";
import {GetNodeL2, AsNodeL1, GetNodeL3, GetNodeDisplayText, GetNodeForm} from "../DB/nodes/$node.js";
import {GetNodeChildren} from "../DB/nodes.js";

@MapEdit
@UserEdit
export class SetNodeIsMultiPremiseArgument extends Command<{mapID?: string, nodeID: string, multiPremiseArgument: boolean}, {}> {
	oldNodeData: MapNodeL2;
	newNodeData: MapNode;
	sub_addRevision: AddNodeRevision;
	Validate() {
		AssertValidate({
			properties: {
				mapID: {type: "string"},
				nodeID: {type: "string"},
				multiPremiseArgument: {type: "boolean"},
			},
			required: ["nodeID", "multiPremiseArgument"],
		}, this.payload, "Payload invalid");

		const {mapID, nodeID, multiPremiseArgument} = this.payload;
		this.oldNodeData = GetNodeL2.BIN(nodeID);

		this.newNodeData = {...AsNodeL1(this.oldNodeData), ...{multiPremiseArgument}};
		if (multiPremiseArgument) {
			//this.newNodeData.childrenOrderType = ChildOrderType.Manual;
			//this.newNodeData.childrenOrder = CE(this.oldNodeData.children).VKeys();

			if (this.oldNodeData.current.titles.base?.length ?? 0 == 0) {
				const newRevision = Clone(this.oldNodeData.current);

				const children = GetNodeChildren(this.oldNodeData.id);
				//const oldChildNode_partialPath = `${nodeID}/${CE(this.oldNodeData.children).VKeys()[0]}`;
				const oldChildNode_partialPath = `${nodeID}/${children[0].id}`;
				const oldChildNode = GetNodeL3.BIN(oldChildNode_partialPath);
				newRevision.titles.base = GetNodeDisplayText(oldChildNode, oldChildNode_partialPath, GetNodeForm(oldChildNode));

				this.sub_addRevision = new AddNodeRevision({mapID, revision: newRevision});
				this.sub_addRevision.Validate();
			}
		} else {
			//this.newNodeData.childrenOrderType = ChildOrderType.ByRating;
			//this.newNodeData.childrenOrder = null;
		}

		AssertValidate("MapNode", this.newNodeData, "New node-data invalid");
	}

	GetDBUpdates() {
		const {nodeID} = this.payload;
		let updates = {};
		updates[`nodes/${nodeID}`] = this.newNodeData;
		if (this.sub_addRevision) {
			updates = MergeDBUpdates(updates, this.sub_addRevision.GetDBUpdates());
		}
		return updates;
	}
}