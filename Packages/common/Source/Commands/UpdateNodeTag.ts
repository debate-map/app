import {AssertV, Command, AV} from "mobx-firelink";
import {UserEdit} from "../CommandMacros";
import {AddSchema, AssertValidate, GetSchemaJSON, Schema} from "mobx-firelink";
import {MapNodeTag, TagComp_keys} from "../Store/firebase/nodeTags/@MapNodeTag";
import {GetNodeTag} from "../Store/firebase/nodeTags";
import {IsUserCreatorOrMod} from "../Store/firebase/users/$user";
import {CE} from "js-vextensions";
import {AssertExistsAndUserIsCreatorOrMod} from "./Helpers/SharedAsserts";

type MainType = MapNodeTag;
const MTName = "MapNodeTag";

AddSchema(`Update${MTName}_payload`, [MTName], ()=>({
	properties: {
		id: {type: "string"},
		updates: Schema({
			properties: CE(GetSchemaJSON(MTName).properties).Including("nodes", ...TagComp_keys),
			minProperties: 1,
		}),
	},
	required: ["id", "updates"],
}));

@UserEdit
export class UpdateNodeTag extends Command<{id: string, updates: Partial<MainType>}> {
	oldData: MainType;
	newData: MainType;
	Validate() {
		AssertValidate(`Update${MTName}_payload`, this.payload, "Payload invalid");

		const {id, updates} = this.payload;
		this.oldData = AV.NonNull = GetNodeTag(id);
		AssertExistsAndUserIsCreatorOrMod(this, this.oldData, "update");

		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {};
		updates[`nodeTags/${id}`] = this.newData;
		return updates;
	}
}