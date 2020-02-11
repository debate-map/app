import {AV, Command} from "mobx-firelink";
import {UserEdit} from "../CommandMacros";
import {MapNodeTag} from "../Store/firebase/nodeTags/@MapNodeTag";
import {GetNodeTag} from "../Store/firebase/nodeTags";

@UserEdit
export class DeleteNodeTag extends Command<{id: string}, {}> {
	oldData: MapNodeTag;
	Validate() {
		const {id} = this.payload;
		this.oldData = AV.NonNull = GetNodeTag(id);
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {
			[`nodeTags/${id}`]: null,
		};
		return updates;
	}
}