import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ClaimForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import { UserEdit, MapEdit } from "Server/CommandMacros";
import {MapNodeRevision} from "../../Store/firebase/nodes/@MapNodeRevision";
import {GetNode} from "Store/firebase/nodes";
import {GetAsync} from "Frame/Database/DatabaseHelpers";

export default class AddNodeRevision extends Command<{revision: MapNodeRevision}> {
	lastNodeRevisionID_addAmount = 0;
	
	Validate_Early() {
		let {revision} = this.payload;
	}

	revisionID: number;
	node_oldData: MapNode;
	async Prepare() {
		let {revision} = this.payload;

		this.revisionID = (await GetDataAsync("general", "lastNodeRevisionID")) + this.lastNodeRevisionID_addAmount + 1;
		revision.creator = this.userInfo.id;
		revision.createdAt = Date.now();
		this.node_oldData = await GetAsync(()=>GetNode(revision.node));
	}
	async Validate() {
		let {revision} = this.payload;
		AssertValidate(`MapNodeRevision`, revision, `Revision invalid`);
	}
	
	GetDBUpdates() {
		let {revision} = this.payload;

		let updates = {};
		updates["general/lastNodeRevisionID"] = this.revisionID;
		updates[`nodes/${revision.node}/currentRevision`] = this.revisionID;
		updates[`nodeRevisions/${this.revisionID}`] = revision;
		return updates;
	}
}