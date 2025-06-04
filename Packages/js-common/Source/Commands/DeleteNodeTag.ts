import {Command, CommandMeta, DBHelper, dbp, SimpleSchema, AssertV} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetNodeTag} from "../DB/nodeTags.js";
import {NodeTag} from "../DB/nodeTags/@NodeTag.js";
import {PERMISSIONS} from "../DB.js";

@UserEdit
@CommandMeta({
	inputSchema: ()=>SimpleSchema({
		$id: {type: "string"},
	}),
})
export class DeleteNodeTag extends Command<{id: string}, {}> {
	oldData: NodeTag;
	Validate() {
		const {id} = this.input;
		this.oldData = GetNodeTag.NN(id);
		AssertV(PERMISSIONS.NodeTag.Delete(this.userInfo.id, this.oldData));
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.input;
		db.set(dbp`nodeTags/${id}`, null);
	}
}