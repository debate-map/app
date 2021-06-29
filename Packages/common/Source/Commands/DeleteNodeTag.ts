import {AV, Command} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {MapNodeTag} from "../Store/db/nodeTags/@MapNodeTag.js";
import {GetNodeTag} from "../Store/db/nodeTags.js";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts.js";

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