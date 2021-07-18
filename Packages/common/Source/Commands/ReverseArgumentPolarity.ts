import {Assert} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, AssertValidate, GetAsync, Command, AssertV, CommandMeta} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit, UserEdit} from "../CommandMacros.js";
import {MapNodeL3} from "../DB/nodes/@MapNode.js";
import {GetNodeL3, ReversePolarity} from "../DB/nodes/$node.js";
import {GetParentNodeID} from "../DB/nodes.js";
import {MapNodeType} from "../DB/nodes/@MapNodeType.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";

@MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>({
		properties: {
			mapID: {type: "string"},
			nodeID: {type: "string"},
			path: {type: "string"},
		},
		required: ["nodeID"],
	}),
})
export class ReverseArgumentPolarity extends Command<{mapID?: string, nodeID: string, path: string}, {}> {
	parentID: string;
	oldNodeData: MapNodeL3;
	newLinkData: NodeChildLink;
	Validate() {
		const {nodeID, path} = this.payload;

		this.oldNodeData = GetNodeL3.NN(path);
		AssertV(this.oldNodeData.type == MapNodeType.argument, "Can only reverse polarity of an argument node.");
		AssertV(this.oldNodeData.link, `Failed to find parent-child link for node in path: ${path}`);
		this.parentID = GetParentNodeID.NN(path);

		this.newLinkData = {...this.oldNodeData.link};
		Assert(this.newLinkData.polarity, "Polarity must be non-null, if calling ReverseArgumentPolarity.");
		this.newLinkData.polarity = ReversePolarity(this.newLinkData.polarity);

		AssertValidate("ChildEntry", this.newLinkData, "New link-data invalid");
	}

	DeclareDBUpdates(db) {
		const {nodeID} = this.payload;
		db.set(`nodes/${this.parentID}/.children/.${nodeID}`, this.newLinkData);
	}
}