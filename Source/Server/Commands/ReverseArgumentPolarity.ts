import {Assert} from "js-vextensions";
import {MapEdit} from "Server/CommandMacros";
import {AddSchema, AssertValidate} from "vwebapp-framework";
import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {GetParentNodeID} from "../../Store/firebase/nodes";
import {GetNodeL3, ReversePolarity} from "../../Store/firebase/nodes/$node";
import {ChildEntry, MapNodeL3} from "../../Store/firebase/nodes/@MapNode";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {UserEdit} from "../CommandMacros";

AddSchema("ReverseArgumentPolarity_payload", {
	properties: {
		mapID: {type: "string"},
		nodeID: {type: "string"},
		path: {type: "string"},
	},
	required: ["nodeID"],
});

@MapEdit
@UserEdit
export class ReverseArgumentPolarity extends Command<{mapID?: number, nodeID: string, path: string}, {}> {
	parentID: string;
	oldNodeData: MapNodeL3;
	newLinkData: ChildEntry;
	Validate() {
		AssertValidate("ReverseArgumentPolarity_payload", this.payload, "Payload invalid");
		const {nodeID, path} = this.payload;

		this.oldNodeData = GetNodeL3(path);
		// AssertV(this.oldNodeData, "oldNodeData is null"); // realized I don't need to add these; the null-ref exceptions are sufficient
		this.parentID = GetParentNodeID(path);

		this.newLinkData = {...this.oldNodeData.link};
		this.newLinkData.polarity = ReversePolarity(this.newLinkData.polarity);

		AssertV(this.oldNodeData.type == MapNodeType.Argument, "Can only reverse polarity of an argument node.");
		AssertValidate("ChildEntry", this.newLinkData, "New link-data invalid");
	}

	GetDBUpdates() {
		const {nodeID} = this.payload;

		const updates = {};
		updates[`nodes/${this.parentID}/.children/.${nodeID}`] = this.newLinkData;
		return updates;
	}
}