import {GetAsync, Command, AssertV, Schema, AV} from "web-vcore/nm/mobx-graphlink";
import {AddSchema, AssertValidate, GetSchemaJSON} from "web-vcore/nm/mobx-graphlink";
import {UserEdit} from "../CommandMacros";
import {GetNode} from "../Store/db/nodes";
import {GetLinkUnderParent} from "../Store/db/nodes/$node";
import {CE} from "web-vcore/nm/js-vextensions";
import {NodeChildLink} from "../Store/db/nodeChildLinks/@NodeChildLink";
import {GetNodeChildLink} from "../Store/db/nodeChildLinks";

AddSchema("UpdateLink_payload", ["ChildEntry"], ()=>({
	properties: {
		linkParentID: {type: "string"},
		linkChildID: {type: "string"},
		linkUpdates: Schema({
			properties: CE(GetSchemaJSON("ChildEntry").properties).Including("form", "polarity"),
		}),
	},
	required: ["linkParentID", "linkChildID", "linkUpdates"],
}));

@UserEdit
export class UpdateLink extends Command<{linkID: string, linkUpdates: Partial<NodeChildLink>}, {}> {
	newData: NodeChildLink;
	Validate() {
		AssertValidate("UpdateLink_payload", this.payload, "Payload invalid");

		const {linkID, linkUpdates} = this.payload;
		const oldData = (a=>oldData).AV.NonNull = GetNodeChildLink(linkID);
		this.newData = {...oldData, ...linkUpdates};
		AssertValidate("ChildEntry", this.newData, "New link-data invalid");
	}

	GetDBUpdates() {
		const {linkID} = this.payload;
		const updates = {};
		updates[`nodeChildLinks/${linkID}`] = this.newData;
		return updates;
	}
}