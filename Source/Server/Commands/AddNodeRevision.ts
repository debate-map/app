import { GetAsync } from "Frame/Database/DatabaseHelpers";
import { MapEdit, UserEdit } from "Server/CommandMacros";
import { GetNode } from "Store/firebase/nodes";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { MapNode } from "../../Store/firebase/nodes/@MapNode";
import { MapNodeRevision } from "../../Store/firebase/nodes/@MapNodeRevision";
import { Command } from "../Command";

@MapEdit
@UserEdit
export default class AddNodeRevision extends Command<{mapID: number, revision: MapNodeRevision}> {
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

		this.returnData = this.revisionID;
	}
	async Validate() {
		let {revision} = this.payload;
		AssertValidate(`MapNodeRevision`, revision, `Revision invalid`);
	}
	
	GetDBUpdates() {
		let {mapID, revision} = this.payload;

		let updates = {};
		updates["general/lastNodeRevisionID"] = this.revisionID;
		updates[`nodes/${revision.node}/currentRevision`] = this.revisionID;
		updates[`nodeRevisions/${this.revisionID}`] = revision;
		updates[`mapNodeEditTimes/${mapID}/${revision.node}`] = revision.createdAt;
		return updates;
	}
}