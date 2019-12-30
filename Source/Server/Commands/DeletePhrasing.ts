import {Command_Old, GetAsync, AssertV, Command} from "mobx-firelink";
import {UserEdit} from "Server/CommandMacros";
import {GetNodePhrasing} from "Store/firebase/nodePhrasings";
import {MapNodePhrasing} from "Store/firebase/nodePhrasings/@MapNodePhrasing";

@UserEdit
export class DeletePhrasing extends Command<{id: string}, {}> {
	oldData: MapNodePhrasing;
	Validate() {
		const {id} = this.payload;
		this.oldData = GetNodePhrasing(id);
		AssertV(this.oldData, "oldData is null");
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {
			[`nodePhrasings/${id}`]: null,
		};
		return updates;
	}
}