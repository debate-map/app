import {Command_Old, GetAsync, AssertV, Command} from "web-vcore/nm/mobx-graphlink";
import {UserEdit} from "../CommandMacros";
import {MapNodePhrasing} from "../Store/firebase/nodePhrasings/@MapNodePhrasing";
import {GetNodePhrasing} from "../Store/firebase/nodePhrasings";
import {AssertExistsAndUserIsCreatorOrMod} from "./Helpers/SharedAsserts";

@UserEdit
export class DeletePhrasing extends Command<{id: string}, {}> {
	oldData: MapNodePhrasing;
	Validate() {
		const {id} = this.payload;
		this.oldData = GetNodePhrasing(id);
		AssertExistsAndUserIsCreatorOrMod(this, this.oldData, "delete");
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {
			[`nodePhrasings/${id}`]: null,
		};
		return updates;
	}
}