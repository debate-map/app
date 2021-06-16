import {AssertV, Command, AV} from "web-vcore/nm/mobx-graphlink";
import {UserEdit} from "../CommandMacros";
import {AddSchema, AssertValidate, GetSchemaJSON, Schema} from "web-vcore/nm/mobx-graphlink";
import {MapNodeTag, TagComp_keys} from "../Store/db/nodeTags/@MapNodeTag";
import {GetNodeTag} from "../Store/db/nodeTags";
import {IsUserCreatorOrMod} from "../Store/db/users/$user";
import {CE} from "web-vcore/nm/js-vextensions";
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