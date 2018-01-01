import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {Map_nameFormat, Map} from "../../Store/firebase/maps/@Map";
import {UserEdit} from "../CommandMacros";
import {MapEdit} from "Server/CommandMacros";
import {Subforum_nameFormat, Subforum} from "../../Store/firebase/forum/@Subforum";

AddSchema({
	properties: {
		subforumID: {type: "number"},
		subforumUpdates: Schema({
			properties: {
				name: {type: "string", pattern: Subforum_nameFormat},
			},
		}),
	},
	required: ["subforumID", "subforumUpdates"],
}, "UpdateSubforumDetails_payload");

@UserEdit
export default class UpdateSubforumDetails extends Command<{subforumID: number, subforumUpdates: Partial<Subforum>}> {
	Validate_Early() {
		AssertValidate("UpdateSubforumDetails_payload", this.payload, `Payload invalid`);
	}

	oldData: Subforum;
	newData: Subforum;
	async Prepare() {
		let {subforumID, subforumUpdates} = this.payload;
		this.oldData = await GetDataAsync({addHelpers: false}, "forum", "subforums", subforumID) as Subforum;
		this.newData = {...this.oldData, ...subforumUpdates};
	}
	async Validate() {
		AssertValidate("Subforum", this.newData, `New subforum-data invalid`);
	}
	
	GetDBUpdates() {
		let {subforumID, subforumUpdates} = this.payload;
		let updates = {};
		updates[`forum/subforums/${subforumID}`] = this.newData;
		return updates;
	}
}