import {Command} from "web-vcore/nm/mobx-graphlink";
import {UserEdit} from "../CommandMacros";
import {GetNodePhrasing} from "../Store/db/nodePhrasings";
import {MapNodePhrasing} from "../Store/db/nodePhrasings/@MapNodePhrasing";
import {AssertUserCanDelete} from "./Helpers/SharedAsserts";

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