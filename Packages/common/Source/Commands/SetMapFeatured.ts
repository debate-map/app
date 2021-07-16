import {Command, AssertV, dbp, AssertValidate} from "web-vcore/nm/mobx-graphlink.js";

import {HasModPermissions} from "../DB/users/$user.js";

export class SetMapFeatured extends Command<{id: string, featured: boolean}, {}> {
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only mods can set whether a map is featured.");
		AssertValidate({
			properties: {
				id: {$ref: "UUID"},
				featured: {type: "boolean"},
			},
			required: ["id", "featured"],
		}, this.payload, "Payload invalid");
	}

	DeclareDBUpdates(db) {
		const {id, featured} = this.payload;
		return {
			[dbp`maps/${id}/.featured`]: featured,
		};
	}
}