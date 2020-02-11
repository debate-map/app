import {AssertV, Command, AV} from "mobx-firelink";
import {UserEdit} from "../CommandMacros";
import {AddSchema, AssertValidate, GetSchemaJSON, Schema} from "mobx-firelink";
import {MapNodeTag, TagComp_keys} from "../Store/firebase/nodeTags/@MapNodeTag";
import {GetNodeTag} from "../Store/firebase/nodeTags";
import {IsUserCreatorOrMod} from "../Store/firebase/users/$user";

type MainType = MapNodeTag;
const MTName = "MapNodeTag";

AddSchema(`Update${MTName}_payload`, [MTName], ()=>({
	properties: {
		id: {type: "string"},
		updates: Schema({
			properties: GetSchemaJSON(MTName).properties.Including("nodes", ...TagComp_keys),
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
		AssertV(IsUserCreatorOrMod(this.userInfo.id, this.oldData), "User is not the tag's creator, or a moderator.");

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