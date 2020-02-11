import {MapEdit, UserEdit} from "../CommandMacros";
import {AddSchema, AssertValidate} from "mobx-firelink";
import {Command_Old, GetAsync, Command, AssertV, MergeDBUpdates} from "mobx-firelink";
import {Clone, CE} from "js-vextensions";
import {AddNodeRevision} from "./AddNodeRevision";
import {MapNodeL2, MapNode} from "../Store/firebase/nodes/@MapNode";
import {GetNodeL2, AsNodeL1, GetNodeL3, GetNodeDisplayText, GetNodeForm} from "../Store/firebase/nodes/$node";

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
		this.oldNodeData = GetNodeL2(nodeID);
		AssertV(this.oldNodeData, "oldNodeData is null.");

		this.newNodeData = {...AsNodeL1(this.oldNodeData), ...{multiPremiseArgument}};
		if (multiPremiseArgument) {
			this.newNodeData.childrenOrder = CE(this.oldNodeData.children).VKeys();

			if (this.oldNodeData.current.titles.base.length == 0) {
				const newRevision = Clone(this.oldNodeData.current);

				const oldChildNode_partialPath = `${nodeID}/${CE(this.oldNodeData.children).VKeys()[0]}`;
				const oldChildNode = GetNodeL3(oldChildNode_partialPath);
				AssertV(oldChildNode, "oldChildNode is null.");
				newRevision.titles.base = GetNodeDisplayText(oldChildNode, oldChildNode_partialPath, GetNodeForm(oldChildNode));

				this.sub_addRevision = new AddNodeRevision({mapID, revision: newRevision});
				this.sub_addRevision.Validate();
			}
		} else {
			this.newNodeData.childrenOrder = null;
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