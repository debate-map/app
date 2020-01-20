import {Assert} from "js-vextensions";
import {Command, AssertV} from "mobx-firelink";
import {UserEdit} from "Server/CommandMacros";
import {GetNode} from "Store/firebase/nodes";
import {MapNodeTag} from "Store/firebase/nodeTags/@MapNodeTag";
import {AssertValidate, GenerateUUID} from "vwebapp-framework";
import {HasModPermissions} from "Store/firebase/users/$user";

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