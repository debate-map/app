import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {GetNode} from "Store/firebase/nodes";
import {AddSchema, AssertValidate, GetSchemaJSON} from "vwebapp-framework";
import {GetLinkUnderParent} from "../../Store/firebase/nodes/$node";
import {ChildEntry} from "../../Store/firebase/nodes/@MapNode";
import {UserEdit} from "../CommandMacros";

AddSchema("UpdateLink_payload", ["ChildEntry"], ()=>({
	properties: {
		linkParentID: {type: "string"},
		linkChildID: {type: "string"},
		linkUpdates: GetSchemaJSON("ChildEntry").Including("form", "polarity"),
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