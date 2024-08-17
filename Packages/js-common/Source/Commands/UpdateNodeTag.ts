import {CE} from "js-vextensions";
import {AssertValidate, Command, CommandMeta, DBHelper, dbp, GetSchemaJSON, NewSchema} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetNodeTag} from "../DB/nodeTags.js";
import {NodeTag, TagComp_keys} from "../DB/nodeTags/@NodeTag.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

type MainType = NodeTag;
const MTName = "NodeTag";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>({
		properties: {
			id: {$ref: "UUID"},
			updates: NewSchema({
				properties: CE(GetSchemaJSON(MTName).properties!).IncludeKeys("nodes", ...TagComp_keys),
				minProperties: 1,
			}),
		},
		required: ["id", "updates"],
	}),
})
export class UpdateNodeTag extends Command<{id: string, updates: Partial<MainType>}> {
	oldData: MainType;
	newData: MainType;
	Validate() {
		const {id, updates} = this.payload;
		this.oldData = GetNodeTag.NN(id);
		AssertUserCanModify(this, this.oldData);

		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`nodeTags/${id}`, this.newData);
	}
}