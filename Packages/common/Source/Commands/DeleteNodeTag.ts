import {AV, Command} from "web-vcore/nm/mobx-graphlink";
import {UserEdit} from "../CommandMacros";
import {MapNodeTag} from "../Store/firebase/nodeTags/@MapNodeTag";
import {GetNodeTag} from "../Store/firebase/nodeTags";
import {AssertExistsAndUserIsCreatorOrMod} from "./Helpers/SharedAsserts";

@UserEdit
export class DeleteNodeTag extends Command<{id: string}, {}> {
	oldData: MapNodeTag;
	Validate() {
		const {id} = this.payload;
		this.oldData = AV.NonNull = GetNodeTag(id);
		AssertExistsAndUserIsCreatorOrMod(this, this.oldData, "delete");
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {
			[`nodeTags/${id}`]: null,
		};
		return updates;
	}
}