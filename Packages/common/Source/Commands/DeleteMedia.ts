import {UserEdit} from "../CommandMacros";
import {GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {Media} from "../Store/db/media/@Media";
import {GetMedia, IsUserCreatorOrMod} from "../Commands";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts";

@UserEdit
export class DeleteMedia extends Command<{id: string}, {}> {
	oldData: Media;
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