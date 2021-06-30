import {AssertV, Command, AV} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {AddSchema, AssertValidate, GetSchemaJSON, Schema} from "web-vcore/nm/mobx-graphlink.js";
import {MapNodeTag, TagComp_keys} from "../DB/nodeTags/@MapNodeTag.js";
import {GetNodeTag} from "../DB/nodeTags.js";
import {IsUserCreatorOrMod} from "../DB/users/$user.js";
import {CE} from "web-vcore/nm/js-vextensions.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

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
		AssertUserCanModify(this, this.oldData);

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