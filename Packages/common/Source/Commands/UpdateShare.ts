import {CE} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, AssertV, AssertValidate, Command, GetSchemaJSON, Schema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {Media} from "../Store/db/media/@Media.js";
import {GetMedia, Share, GetShare} from "../Store.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

type MainType = Share;
const MTName = "Share";

@UserEdit
export class UpdateShare extends Command<{id: string, updates: Partial<MainType>}, {}> {
	oldData: MainType;
	newData: MainType;
	Validate() {
		AssertValidate({
			properties: {
				id: {type: "string"},
				updates: Schema({
					properties: CE(GetSchemaJSON(MTName).properties).Including("name", "mapID", "mapView"),
				}),
			},
			required: ["id", "updates"],
		}, this.payload, "Payload invalid");

		const {id, updates} = this.payload;
		this.oldData = GetShare(id);
		AssertUserCanModify(this, this.oldData);
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, "New-data invalid");
	}

	GetDBUpdates() {
		const {id} = this.payload;

		const updates = {
			[`shares/${id}`]: this.newData,
		} as any;
		return updates;
	}
}