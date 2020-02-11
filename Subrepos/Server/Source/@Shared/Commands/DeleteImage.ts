import {UserEdit} from "../CommandMacros";
import {Command_Old, GetAsync, Command} from "mobx-firelink";
import {GetImage} from "../Store/firebase/images";
import {Image} from "../Store/firebase/images/@Image";

@UserEdit
export class DeleteImage extends Command<{id: string}, {}> {
	oldData: Image;
	Validate() {
		const {id} = this.payload;
		this.oldData = GetImage(id);
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {
			[`images/${id}`]: null,
		};
		return updates;
	}
}