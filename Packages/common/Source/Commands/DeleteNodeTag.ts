import {AV, Command} from "web-vcore/nm/mobx-graphlink";
import {UserEdit} from "../CommandMacros";
import {MapNodeTag} from "../Store/db/nodeTags/@MapNodeTag";
import {GetNodeTag} from "../Store/db/nodeTags";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts";

@UserEdit
export class DeleteNodeTag extends Command<{id: string}, {}> {
	oldData: MapNodeTag;
	Validate() {
		const {id} = this.payload;
		this.oldData = AV.NonNull = GetNodeTag(id);
		AssertUserCanDelete(this, this.oldData);
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {
			[`nodeTags/${id}`]: null,
		};
		return updates;
	}
}