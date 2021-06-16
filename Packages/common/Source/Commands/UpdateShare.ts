import {CE} from "web-vcore/nm/js-vextensions";
import {AddSchema, AssertV, AssertValidate, Command, GetSchemaJSON, Schema} from "web-vcore/nm/mobx-graphlink";
import {UserEdit} from "../CommandMacros";
import {Media} from "../Store/firebase/media/@Media";
import {GetMedia, Share, GetShare} from "../Commands";
import {AssertExistsAndUserIsCreatorOrMod} from "./Helpers/SharedAsserts";

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
		AssertExistsAndUserIsCreatorOrMod(this, this.oldData, "update");
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