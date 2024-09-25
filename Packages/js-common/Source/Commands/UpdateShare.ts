import {CE} from "js-vextensions";
import {AssertValidate, Command, CommandMeta, DBHelper, dbp, GetSchemaJSON, NewSchema, AssertV} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetShare, PERMISSIONS, Share} from "../DB.js";

type MainType = Share;
const MTName = "Share";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>({
		properties: {
			id: {$ref: "UUID"},
			updates: NewSchema({
				properties: CE(GetSchemaJSON(MTName).properties!).IncludeKeys("name", "mapID", "mapView"),
			}),
		},
		required: ["id", "updates"],
	}),
})
export class UpdateShare extends Command<{id: string, updates: Partial<MainType>}, {}> {
	oldData: MainType;
	newData: MainType;
	Validate() {
		const {id, updates} = this.payload;
		this.oldData = GetShare.NN(id);
		AssertV(PERMISSIONS.Share.Modify(this.userInfo.id, this.oldData));
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, "New-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`shares/${id}`, this.newData);
	}
}