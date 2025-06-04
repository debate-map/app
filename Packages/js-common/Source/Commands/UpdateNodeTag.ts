import {CE} from "js-vextensions";
import {AssertValidate, Command, CommandMeta, DBHelper, dbp, GetSchemaJSON, NewSchema, AssertV} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetNodeTag} from "../DB/nodeTags.js";
import {NodeTag, TagComp_keys} from "../DB/nodeTags/@NodeTag.js";
import {PERMISSIONS} from "../DB.js";

type MainType = NodeTag;
const MTName = "NodeTag";

@UserEdit
@CommandMeta({
	inputSchema: ()=>({
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
		const {id, updates} = this.input;
		this.oldData = GetNodeTag.NN(id);
		AssertV(PERMISSIONS.NodeTag.Modify(this.userInfo.id, this.oldData));

		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.input;
		db.set(dbp`nodeTags/${id}`, this.newData);
	}
}