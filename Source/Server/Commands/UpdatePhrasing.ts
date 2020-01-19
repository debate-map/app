import {MapNodePhrasing} from "Store/firebase/nodePhrasings/@MapNodePhrasing";
import {AddSchema, GetSchemaJSON, Schema, AssertValidate} from "vwebapp-framework";
import {UserEdit} from "Server/CommandMacros";
import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {GetNodePhrasings, GetNodePhrasing} from "Store/firebase/nodePhrasings";

type MainType = MapNodePhrasing;
const MTName = "MapNodePhrasing";

AddSchema(`Update${MTName}_payload`, [MTName], ()=>({
	properties: {
		id: {type: "string"},
		updates: Schema({
			properties: GetSchemaJSON(MTName).properties.Including("type", "text", "description"),
			//minProperties: 1,
		}),
	},
	required: ["id", "updates"],
}));

@UserEdit
export class UpdatePhrasing extends Command<{id: string, updates: Partial<MainType>}> {
	oldData: MainType;
	newData: MainType;
	Validate() {
		AssertValidate(`Update${MTName}_payload`, this.payload, "Payload invalid");

		const {id, updates} = this.payload;
		this.oldData = GetNodePhrasing(id);
		AssertV(this.oldData, "oldData is null.");
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {};
		updates[`nodePhrasings/${id}`] = this.newData;
		return updates;
	}
}