import {Assert} from "js-vextensions";
import {AssertValidate, Command, CommandMeta, DBHelper, dbp, SimpleSchema} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {NodePhrasing} from "../DB/nodePhrasings/@NodePhrasing.js";
import {GetNode} from "../DB/nodes.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$phrasing: {$ref: NodePhrasing.name},
	}),
	returnSchema: ()=>SimpleSchema({$id: {type: "string"}}),
})
export class AddPhrasing extends Command<{phrasing: NodePhrasing}, {id: string}> {
	Validate() {
		const {phrasing} = this.payload;

		phrasing.id = this.GenerateUUID_Once("id");
		phrasing.creator = this.userInfo.id;
		phrasing.createdAt = Date.now();
		AssertValidate("NodePhrasing", phrasing, "NodePhrasing invalid");

		const node = GetNode(phrasing.node);
		Assert(node, `Node with id ${phrasing.node} does not exist.`);

		this.returnData = {id: phrasing.id};
	}

	DeclareDBUpdates(db: DBHelper) {
		const {phrasing} = this.payload;
		db.set(dbp`nodePhrasings/${phrasing.id}`, phrasing);
	}
}