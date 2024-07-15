import {Command, AssertV, dbp, AssertValidate, CommandMeta, SimpleSchema, DBHelper} from "mobx-graphlink";
import {HasModPermissions} from "../DB/users/$user.js";

@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$id: {$ref: "UUID"},
		$featured: {type: "boolean"},
	}),
})
export class SetMapFeatured extends Command<{id: string, featured: boolean}, {}> {
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only mods can set whether a map is featured.");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id, featured} = this.payload;
		db.set(dbp`maps/${id}/.featured`, featured);
	}
}