import { GetAsync_Raw } from "Frame/Database/DatabaseHelpers";
import { MapEdit } from "Server/CommandMacros";
import { Assert } from "js-vextensions";
import { GetParentNodeID } from "../../Store/firebase/nodes";
import { GetNodeL3, ReversePolarity } from "../../Store/firebase/nodes/$node";
import { ChildEntry, MapNodeL3 } from "../../Store/firebase/nodes/@MapNode";
import { MapNodeType } from "../../Store/firebase/nodes/@MapNodeType";
import { Command } from "../Command";
import { UserEdit } from "../CommandMacros";

AddSchema({
	properties: {
		mapID: {type: "number"},
		nodeID: {type: "number"},
		path: {type: "string"},
	},
	required: ["nodeID"],
}, "ReverseArgumentPolarity_payload");

@MapEdit
@UserEdit
export default class ReverseArgumentPolarity extends Command<{mapID?: number, nodeID: number, path: string}> {
	Validate_Early() {
		AssertValidate("ReverseArgumentPolarity_payload", this.payload, `Payload invalid`);
	}

	parentID: number;
	oldNodeData: MapNodeL3;
	newLinkData: ChildEntry;
	async Prepare() {
		let {nodeID, path} = this.payload;

		this.oldNodeData = await GetAsync_Raw(()=>GetNodeL3(path));
		this.parentID = GetParentNodeID(path);
		
		this.newLinkData = {...this.oldNodeData.link};
		this.newLinkData.polarity = ReversePolarity(this.newLinkData.polarity);
	}
	async Validate() {
		Assert(this.oldNodeData.type == MapNodeType.Argument, "Can only reverse polarity of an argument node.");
		AssertValidate("ChildEntry", this.newLinkData, `New link-data invalid`);
	}

	GetDBUpdates() {
		let {nodeID} = this.payload;

		let updates = {};
		updates[`nodes/${this.parentID}/children/${nodeID}`] = this.newLinkData;
		return updates;
	}
}