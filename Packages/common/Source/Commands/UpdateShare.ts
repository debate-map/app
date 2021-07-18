import {CE} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, AssertV, AssertValidate, Command, CommandMeta, dbp, GetSchemaJSON, NewSchema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {Media} from "../DB/media/@Media.js";
import {GetMedia, Share, GetShare} from "../DB.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

type MainType = Share;
const MTName = "Share";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>({
		properties: {
			id: {$ref: "UUID"},
			updates: NewSchema({
				properties: CE(GetSchemaJSON(MTName).properties!).Including("name", "mapID", "mapView"),
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
		AssertUserCanModify(this, this.oldData);
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, "New-data invalid");
	}

	DeclareDBUpdates(db) {
		const {id} = this.payload;
		db.set(dbp`shares/${id}`, this.newData);
	}
}