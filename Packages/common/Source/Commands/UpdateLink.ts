import {GetAsync, Command, AssertV, NewSchema, AV, AddSchema, AssertValidate, GetSchemaJSON} from "web-vcore/nm/mobx-graphlink.js";

import {CE} from "web-vcore/nm/js-vextensions.js";
import {UserEdit} from "../CommandMacros.js";
import {GetNode} from "../DB/nodes.js";
import {GetLinkUnderParent} from "../DB/nodes/$node.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";
import {GetNodeChildLink} from "../DB/nodeChildLinks.js";

AddSchema("UpdateLink_payload", ["ChildEntry"], ()=>({
	properties: {
		linkParentID: {type: "string"},
		linkChildID: {type: "string"},
		linkUpdates: NewSchema({
			properties: CE(GetSchemaJSON("ChildEntry").properties!).Including("form", "polarity"),
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
		const oldData = GetNodeChildLink.NN(linkID);
		this.newData = {...oldData, ...linkUpdates};
		AssertValidate("ChildEntry", this.newData, "New link-data invalid");
	}

	DeclareDBUpdates(db) {
		const {linkID} = this.payload;
		db.set(`nodeChildLinks/${linkID}`, this.newData);
	}
}