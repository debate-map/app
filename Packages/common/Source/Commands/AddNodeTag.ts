import {Assert} from "web-vcore/nm/js-vextensions.js";
import {Command, AssertV, dbp, AssertValidate, GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";

import {MapNodeTag} from "../DB/nodeTags/@MapNodeTag.js";
import {HasModPermissions} from "../DB/users/$user.js";
import {GetNode} from "../DB/nodes.js";

@UserEdit
export class AddNodeTag extends Command<{tag: MapNodeTag}, string> {
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only moderators can add tags currently.");

		const {tag} = this.payload;

		tag.id = tag.id ?? GenerateUUID();
		tag.creator = this.userInfo.id;
		tag.createdAt = Date.now();
		AssertValidate("MapNodeTag", tag, "MapNodeTag invalid");

		for (const nodeID of tag.nodes) {
			const node = GetNode(nodeID);
			AssertV(node, `Node with id ${nodeID} does not exist.`);
		}

		this.returnData = tag.id;
	}

	DeclareDBUpdates(db) {
		const {tag} = this.payload;
		db.set(dbp`nodeTags/${tag.id}`, tag);
	}
}