import {Command} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {GetNodePhrasing} from "../Store/db/nodePhrasings.js";
import {MapNodePhrasing} from "../Store/db/nodePhrasings/@MapNodePhrasing.js";
import {AssertUserCanDelete} from "./Helpers/SharedAsserts.js";

@UserEdit
export class DeletePhrasing extends Command<{id: string}, {}> {
	oldData: MapNodePhrasing;
	Validate() {
		const {id} = this.payload;
		this.oldData = GetNodePhrasing(id);
		AssertUserCanDelete(this, this.oldData);
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {
			[`nodePhrasings/${id}`]: null,
		};
		return updates;
	}
}