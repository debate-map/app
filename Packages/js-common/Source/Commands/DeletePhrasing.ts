import {Command, CommandMeta, DBHelper, dbp, SimpleSchema, AssertV} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetNodePhrasing} from "../DB/nodePhrasings.js";
import {NodePhrasing} from "../DB/nodePhrasings/@NodePhrasing.js";
import {PERMISSIONS} from "../DB.js";

@UserEdit
@CommandMeta({
	inputSchema: ()=>SimpleSchema({
		$id: {type: "string"},
	}),
})
export class DeletePhrasing extends Command<{id: string}, {}> {
	oldData: NodePhrasing;
	Validate() {
		const {id} = this.input;
		this.oldData = GetNodePhrasing.NN(id);
		AssertV(PERMISSIONS.NodePhrasing.Delete(this.userInfo.id, this.oldData));
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.input;
		db.set(dbp`nodePhrasings/${id}`, null);
	}
}