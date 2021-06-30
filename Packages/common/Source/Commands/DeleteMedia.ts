import {UserEdit} from "../CommandMacros.js";
import {GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink.js";
import {Media} from "../DB/media/@Media.js";
import {GetMedia, IsUserCreatorOrMod} from "../DB.js";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts.js";

@UserEdit
export class DeleteMedia extends Command<{id: string}, {}> {
	oldData: Media|n;
	Validate() {
		const {id} = this.payload;
		this.oldData = GetMedia(id);
		AssertUserCanDelete(this, this.oldData);
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {
			[`medias/${id}`]: null,
		};
		return updates;
	}
}