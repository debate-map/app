import {GetAsync, Command, AssertV, Schema} from "web-vcore/nm/mobx-graphlink";
import {AddSchema, AssertValidate, GetSchemaJSON} from "web-vcore/nm/mobx-graphlink";
import {UserEdit} from "../CommandMacros";
import {ChildEntry} from "../Store/db/nodes/@MapNode";
import {GetNode} from "../Store/db/nodes";
import {GetLinkUnderParent} from "../Store/db/nodes/$node";
import {CE} from "web-vcore/nm/js-vextensions";

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
export class UpdateLink extends Command<{linkParentID: string, linkChildID: string, linkUpdates: Partial<ChildEntry>}, {}> {
	newData: ChildEntry;
	Validate() {
		AssertValidate("UpdateLink_payload", this.payload, "Payload invalid");

		const {linkParentID, linkChildID, linkUpdates} = this.payload;
		const parent = GetNode(linkParentID);
		AssertV(parent, "parent is null.");
		const oldData = GetLinkUnderParent(linkChildID, parent);
		this.newData = {...oldData, ...linkUpdates};
		AssertValidate("ChildEntry", this.newData, "New link-data invalid");
	}

	GetDBUpdates() {
		const {linkParentID, linkChildID} = this.payload;
		const updates = {};
		updates[`nodes/${linkParentID}/.children/.${linkChildID}`] = this.newData;
		return updates;
	}
}