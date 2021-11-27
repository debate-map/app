import {AddSchema, AssertValidate, NewSchema, GetSchemaJSON, GetAsync, Command, AssertV, CommandMeta, DBHelper, dbp, SimpleSchema, DeriveJSONSchema} from "web-vcore/nm/mobx-graphlink.js";
import {CE} from "web-vcore/nm/js-vextensions.js";
import {MapEdit, UserEdit} from "../CommandMacros.js";
import {Map} from "../DB/maps/@Map.js";
import {GetMap} from "../DB/maps.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

const MTClass = Map;
type MT = typeof MTClass.prototype;
const MTName = MTClass.name;

@MapEdit("id")
@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$id: {$ref: "UUID"},
		$updates: DeriveJSONSchema(MTClass, {
			includeOnly: ["accessPolicy", "name", "note", "noteInline", "defaultExpandDepth", "nodeAccessPolicy", /*"nodeAccessPolicy_required",*/ "editors", "extras"],
			makeOptional_all: true,
		}),
	}),
})
export class UpdateMapDetails extends Command<{id: string, updates: Partial<MT>}, {}> {
	oldData: MT;
	newData: MT;
	Validate() {
		const {id: mapID, updates: mapUpdates} = this.payload;
		this.oldData = GetMap.NN(mapID);
		AssertUserCanModify(this, this.oldData);
		this.newData = {...this.oldData, ...mapUpdates};
		this.newData.editedAt = Date.now();
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`maps/${id}`, this.newData);
	}
}