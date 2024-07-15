import {AssertValidate, Command, CommandMeta, DBHelper, dbp, DeriveJSONSchema, SimpleSchema} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetNodeLink} from "../DB/nodeLinks.js";
import {NodeLink} from "../DB/nodeLinks/@NodeLink.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$linkID: {$ref: "UUID"},
		$linkUpdates: DeriveJSONSchema(NodeLink, {includeOnly: ["form", "polarity", "orderKey"], makeOptional_all: true}),
	}),
})
export class UpdateLink extends Command<{linkID: string, linkUpdates: Partial<NodeLink>}, {}> {
	newData: NodeLink;
	Validate() {
		const {linkID, linkUpdates} = this.payload;
		const oldData = GetNodeLink.NN(linkID);
		this.newData = {...oldData, ...linkUpdates};
		AssertValidate("NodeLink", this.newData, "New node-child-link data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {linkID} = this.payload;
		db.set(dbp`nodeLinks/${linkID}`, this.newData);
	}
}