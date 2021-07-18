import {Command, AssertV, dbp, AssertValidate, CommandMeta} from "web-vcore/nm/mobx-graphlink.js";
import {HasModPermissions} from "../DB/users/$user.js";

@CommandMeta({
	payloadSchema: ()=>({
		properties: {
			id: {$ref: "UUID"},
			featured: {type: "boolean"},
		},
		required: ["id", "featured"],
	}),
})
export class SetMapFeatured extends Command<{id: string, featured: boolean}, {}> {
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only mods can set whether a map is featured.");
	}

	DeclareDBUpdates(db) {
		const {id, featured} = this.payload;
		return {
			[dbp`maps/${id}/.featured`]: featured,
		};
	}
}