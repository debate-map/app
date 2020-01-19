import {AV, Command} from "mobx-firelink";
import {UserEdit} from "Server/CommandMacros";
import {GetNodeTag} from "Store/firebase/nodeTags";
import {MapNodeTag} from "Store/firebase/nodeTags/@MapNodeTag";

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