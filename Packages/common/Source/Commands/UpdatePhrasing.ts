import {AddSchema, GetSchemaJSON, NewSchema, AssertValidate, GetAsync, Command, AssertV, CommandMeta, DBHelper, dbp} from "web-vcore/nm/mobx-graphlink.js";
import {CE} from "web-vcore/nm/js-vextensions.js";
import {UserEdit} from "../CommandMacros.js";

import {MapNodePhrasing} from "../DB/nodePhrasings/@MapNodePhrasing.js";
import {GetNodePhrasing} from "../DB/nodePhrasings.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

type MainType = MapNodePhrasing;
const MTName = "MapNodePhrasing";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>({
		properties: {
			id: {$ref: "UUID"},
			updates: NewSchema({
				properties: CE(GetSchemaJSON(MTName).properties!).IncludeKeys("type", "text", "description"),
				//minProperties: 1,
			}),
		},
		required: ["id", "updates"],
	}),
})
export class UpdatePhrasing extends Command<{id: string, updates: Partial<MainType>}> {
	oldData: MainType;
	newData: MainType;
	Validate() {
		const {id, updates} = this.payload;
		this.oldData = GetNodePhrasing(id);
		AssertUserCanModify(this, this.oldData);
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`nodePhrasings/${id}`, this.newData);
	}
}