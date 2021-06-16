import {UserEdit} from "../CommandMacros";
import {Command_Old, GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {Media} from "../Store/db/media/@Media";
import {GetMedia, IsUserCreatorOrMod, GetShare, Share} from "../Commands";
import {AssertExistsAndUserIsCreatorOrMod} from "./Helpers/SharedAsserts";

@UserEdit
export class DeleteShare extends Command<{id: string}, {}> {
	oldData: Share;
	Validate() {
		const {id} = this.payload;
		this.oldData = GetShare(id);
		AssertExistsAndUserIsCreatorOrMod(this, this.oldData, "delete");
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {
			[`shares/${id}`]: null,
		};
		return updates;
	}
}