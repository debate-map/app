import {MapEdit} from "Server/CommandMacros";
import {AddSchema, AssertValidate, Schema, GetSchemaJSON} from "vwebapp-framework";
import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {GetMap} from "Store/firebase/maps";
import {Map, Map_namePattern} from "../../Store/firebase/maps/@Map";
import {UserEdit} from "../CommandMacros";

type MainType = Map;
const MTName = "Map";

AddSchema(`Update${MTName}Details_payload`, [MTName], ()=>({
	properties: {
		id: {type: "string"},
		updates: Schema({
			properties: GetSchemaJSON(MTName).properties.Including("name", "note", "noteLine", "defaultExpandDepth", "defaultTimelineID", "requireMapEditorsCanEdit", "nodeDefaults", "editorIDs"),
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
		this.oldData = GetMap(mapID);
		AssertV(this.oldData, "oldData is null.");
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