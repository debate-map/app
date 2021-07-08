import {AddSchema, GetSchemaJSON, Schema, AssertValidate, GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink.js";
import {CE} from "web-vcore/nm/js-vextensions.js";
import {UserEdit} from "../CommandMacros.js";

import {MapNodePhrasing} from "../DB/nodePhrasings/@MapNodePhrasing.js";
import {GetNodePhrasing} from "../DB/nodePhrasings.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

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
		AssertUserCanModify(this, this.oldData);
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	DeclareDBUpdates(db) {
		const {id} = this.payload;
		db.set(`nodePhrasings/${id}`, this.newData);
	}
}