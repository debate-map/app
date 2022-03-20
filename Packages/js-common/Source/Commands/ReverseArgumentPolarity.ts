import {Assert} from "web-vcore/nm/js-vextensions.js";
import {AssertV, AssertValidate, Command, CommandMeta, DBHelper, dbp} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";
import {GetParentNodeID} from "../DB/nodes.js";
import {GetNodeL3, ReversePolarity} from "../DB/nodes/$node.js";
import {MapNodeL3} from "../DB/nodes/@MapNode.js";
import {MapNodeType} from "../DB/nodes/@MapNodeType.js";

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
export class ReverseArgumentPolarity extends Command<{mapID?: string|n, nodeID: string, path: string}, {}> {
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

		AssertValidate(NodeChildLink.name, this.newLinkData, "New link-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		db.set(dbp`nodeChildLinks/${this.newLinkData.id}`, this.newLinkData);
	}
}