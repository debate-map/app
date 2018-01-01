import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import { UserEdit, MapEdit } from "Server/CommandMacros";
import {Section} from "Store/firebase/forum/@Section";
import {Subforum} from "Store/firebase/forum/@Subforum";

@UserEdit
export default class AddSubforum extends Command<{sectionID: number, subforum: Subforum}> {
	subforumID: number;
	oldSubforumOrder: number[];
	async Prepare() {
		let {sectionID, subforum} = this.payload;
		let firebase = store.firebase.helpers;

		let lastSubforumID = await GetDataAsync("forum", "general", "lastSubforumID") as number;
		this.subforumID = lastSubforumID + 1;
		subforum.section = sectionID;

		this.oldSubforumOrder = await GetDataAsync("forum", "sections", sectionID, "subforumOrder") || [];

		this.returnData = this.subforumID;
	}
	async Validate() {
		let {subforum} = this.payload;
		AssertValidate(`Subforum`, subforum, `Subforum invalid`);
	}
	
	GetDBUpdates() {
		let {sectionID, subforum} = this.payload;
		let updates = {};
		updates["forum/general/lastSubforumID"] = this.subforumID;
		updates[`forum/sections/${sectionID}/subforumOrder`] = this.oldSubforumOrder.concat(this.subforumID);
		updates[`forum/subforums/${this.subforumID}`] = subforum;
		return updates;
	}
}