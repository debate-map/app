import {UserEdit} from "../CommandMacros.js";
import {GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink.js";
import {Media} from "../Store/db/media/@Media.js";
import {GetMedia, IsUserCreatorOrMod, GetShare, Share} from "../Store.js";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts.js";

@UserEdit
export class DeleteShare extends Command<{id: string}, {}> {
	oldData: Share;
	Validate() {
		const {id} = this.payload;
		this.oldData = GetShare(id);
		AssertUserCanDelete(this, this.oldData);
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {
			[`shares/${id}`]: null,
		};
		return updates;
	}
}