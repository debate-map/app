import {Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {AssertValidate} from "web-vcore/nm/mobx-graphlink";
import {HasModPermissions} from "../Store/db/users/$user";

export class SetMapFeatured extends Command<{id: string, featured: boolean}, {}> {
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only mods can set whether a map is featured.");
		AssertValidate({
			properties: {
				id: {type: "string"},
				featured: {type: "boolean"},
			},
			required: ["id", "featured"],
		}, this.payload, "Payload invalid");
	}

	GetDBUpdates() {
		const {id, featured} = this.payload;
		return {
			[`maps/${id}/.featured`]: featured,
		};
	}
}