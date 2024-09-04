import {AssertValidate, Command, CommandMeta, DBHelper, dbp, DeriveJSONSchema, SimpleSchema, AssertV} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetMedia, PERMISSIONS} from "../DB.js";
import {Media} from "../DB/media/@Media.js";

const MTClass = Media;
type MT = typeof MTClass.prototype;
const MTName = MTClass.name;

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$id: {$ref: "UUID"},
		$updates: DeriveJSONSchema(MTClass, {includeOnly: ["accessPolicy", "name", "type", "url", "description"], makeOptional_all: true}),
	}),
})
export class UpdateMedia extends Command<{id: string, updates: Partial<Media>}, {}> {
	oldData: MT;
	newData: MT;
	Validate() {
		const {id, updates} = this.payload;
		this.oldData = GetMedia.NN(id);
		AssertV(PERMISSIONS.Media.Modify(this.userInfo.id, this.oldData));
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, "New-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`medias/${id}`, this.newData);
	}
}