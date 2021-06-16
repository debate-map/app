import {AddSchema, GetSchemaJSON, Schema, AssertValidate} from "web-vcore/nm/mobx-graphlink";
import {UserEdit} from "../CommandMacros";
import {Command_Old, GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {MapNodePhrasing} from "../Store/firebase/nodePhrasings/@MapNodePhrasing";
import {GetNodePhrasing} from "../Store/firebase/nodePhrasings";
import {CE} from "web-vcore/nm/js-vextensions";
import {AssertExistsAndUserIsCreatorOrMod} from "./Helpers/SharedAsserts";

type MainType = MapNodePhrasing;
const MTName = "MapNodePhrasing";

AddSchema(`Update${MTName}_payload`, [MTName], ()=>({
	properties: {
		id: {type: "string"},
		updates: Schema({
			properties: CE(GetSchemaJSON(MTName).properties).Including("type", "text", "description"),
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
		AssertExistsAndUserIsCreatorOrMod(this, this.oldData, "update");
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