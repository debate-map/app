import {Assert} from "js-vextensions";
import {AssertV, AssertValidate, Command, CommandMeta, DBHelper, dbp} from "mobx-graphlink";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {NodeLink} from "../DB/nodeLinks/@NodeLink.js";
import {GetParentNodeID} from "../DB/nodes.js";
import {GetNodeL3, ReversePolarity} from "../DB/nodes/$node.js";
import {NodeL3} from "../DB/nodes/@Node.js";
import {NodeType} from "../DB/nodes/@NodeType.js";

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
	oldNodeData: NodeL3;
	newLinkData: NodeLink;
	Validate() {
		const {nodeID, path} = this.payload;

		this.oldNodeData = GetNodeL3.NN(path);
		AssertV(this.oldNodeData.type == NodeType.argument, "Can only reverse polarity of an argument node.");
		AssertV(this.oldNodeData.link, `Failed to find parent-child link for node in path: ${path}`);
		this.parentID = GetParentNodeID.NN(path);

		this.newLinkData = {...this.oldNodeData.link};
		Assert(this.newLinkData.polarity, "Polarity must be non-null, if calling ReverseArgumentPolarity.");
		this.newLinkData.polarity = ReversePolarity(this.newLinkData.polarity);

		AssertValidate(NodeLink.name, this.newLinkData, "New link-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		db.set(dbp`nodeLinks/${this.newLinkData.id}`, this.newLinkData);
	}
}