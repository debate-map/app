import {MapEdit} from "../CommandMacros.js";
import {AddSchema, AssertValidate, Schema, GetSchemaJSON} from "web-vcore/nm/mobx-graphlink.js";
import {GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {Map} from "../DB/maps/@Map.js";
import {GetMap} from "../DB/maps.js";
import {CE} from "web-vcore/nm/js-vextensions.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

type MainType = Map;
const MTName = "Map";

AddSchema(`Update${MTName}Details_payload`, [MTName], ()=>({
	properties: {
		id: {type: "string"},
		updates: Schema({
			properties: CE(GetSchemaJSON(MTName).properties).Including("name", "note", "noteInline", "visibility", "defaultExpandDepth", "defaultTimelineID", "requireMapEditorsCanEdit", "nodeDefaults", "editorIDs"),
		}),
	},
	required: ["id", "updates"],
}));

@MapEdit("id")
@UserEdit
export class UpdateMapDetails extends Command<{id: string, updates: Partial<MainType>}, {}> {
	oldData: MainType;
	newData: MainType;
	Validate() {
		AssertValidate(`Update${MTName}Details_payload`, this.payload, "Payload invalid");

		const {id: mapID, updates: mapUpdates} = this.payload;
		this.oldData = GetMap.BIN(mapID);
		AssertUserCanModify(this, this.oldData);
		this.newData = {...this.oldData, ...mapUpdates};
		this.newData.editedAt = Date.now();
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {};
		updates[`maps/${id}`] = this.newData;
		return updates;
	}
}