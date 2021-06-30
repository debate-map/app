import {Assert} from "web-vcore/nm/js-vextensions.js";
import {Command, AssertV} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {AssertValidate, GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";
import {MapNodeTag} from "../DB/nodeTags/@MapNodeTag.js";
import {HasModPermissions} from "../DB/users/$user.js";
import {GetNode} from "../DB/nodes.js";

@UserEdit
export class AddNodeTag extends Command<{tag: MapNodeTag}, string> {
	id: string;
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only moderators can add tags currently.");
		
		const {tag} = this.payload;

		this.id = this.id ?? GenerateUUID();
		tag.creator = this.userInfo.id;
		tag.createdAt = Date.now();
		AssertValidate("MapNodeTag", tag, "MapNodeTag invalid");

		for (let nodeID of tag.nodes) {
			const node = GetNode(nodeID);
			AssertV(node, `Node with id ${nodeID} does not exist.`);
		}

		this.returnData = this.id;
	}

	GetDBUpdates() {
		const {tag} = this.payload;
		const updates = {
			[`nodeTags/${this.id}`]: tag,
		};
		return updates;
	}
}