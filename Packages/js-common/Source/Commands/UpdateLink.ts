import {AssertValidate, Command, CommandMeta, DBHelper, dbp, DeriveJSONSchema, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetNodeChildLink} from "../DB/nodeChildLinks.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$linkID: {$ref: "UUID"},
		$linkUpdates: DeriveJSONSchema(NodeChildLink, {includeOnly: ["form", "polarity", "orderKey"], makeOptional_all: true}),
	}),
})
export class UpdateLink extends Command<{linkID: string, linkUpdates: Partial<NodeChildLink>}, {}> {
	newData: NodeChildLink;
	Validate() {
		const {linkID, linkUpdates} = this.payload;
		const oldData = GetNodeChildLink.NN(linkID);
		this.newData = {...oldData, ...linkUpdates};
		AssertValidate("NodeChildLink", this.newData, "New node-child-link data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {linkID} = this.payload;
		db.set(dbp`nodeChildLinks/${linkID}`, this.newData);
	}
}