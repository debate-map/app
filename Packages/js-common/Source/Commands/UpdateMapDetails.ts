import {AssertValidate, Command, CommandMeta, AssertV, DBHelper, dbp, DeriveJSONSchema, SimpleSchema} from "mobx-graphlink";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetMap} from "../DB/maps.js";
import {DMap} from "../DB/maps/@Map.js";
import {PERMISSIONS} from "../DB.js";

const MTClass = DMap;
type MT = typeof MTClass.prototype;
const MTName = MTClass.name;

@MapEdit("id")
@UserEdit
@CommandMeta({
	inputSchema: ()=>SimpleSchema({
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
		const {id: mapID, updates: mapUpdates} = this.input;
		this.oldData = GetMap.NN(mapID);
		AssertV(PERMISSIONS.Map.Modify(this.userInfo.id, this.oldData));
		this.newData = {...this.oldData, ...mapUpdates};
		this.newData.editedAt = Date.now();
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.input;
		db.set(dbp`maps/${id}`, this.newData);
	}
}