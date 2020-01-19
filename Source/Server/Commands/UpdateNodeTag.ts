import {AssertV, Command, AV} from "mobx-firelink";
import {UserEdit} from "Server/CommandMacros";
import {GetNodePhrasing} from "Store/firebase/nodePhrasings";
import {MapNodeTag, TagComp_keys} from "Store/firebase/nodeTags/@MapNodeTag";
import {AddSchema, AssertValidate, GetSchemaJSON, Schema} from "vwebapp-framework";
import {GetNodeTag} from "Store/firebase/nodeTags";

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