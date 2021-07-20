import {AssertV, Command, AV, AddSchema, AssertValidate, GetSchemaJSON, NewSchema, CommandMeta, DBHelper, dbp} from "web-vcore/nm/mobx-graphlink.js";
import {CE} from "web-vcore/nm/js-vextensions.js";
import {UserEdit} from "../CommandMacros.js";

import {MapNodeTag, TagComp_keys} from "../DB/nodeTags/@MapNodeTag.js";
import {GetNodeTag} from "../DB/nodeTags.js";
import {IsUserCreatorOrMod} from "../DB/users/$user.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

type MainType = MapNodeTag;
const MTName = "MapNodeTag";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>({
		properties: {
			id: {$ref: "UUID"},
			updates: NewSchema({
				properties: CE(GetSchemaJSON(MTName).properties!).Including("nodes", ...TagComp_keys),
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