import {UserEdit} from "../CommandMacros.js";
import {AddSchema, AssertValidate, GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";
import {Assert} from "web-vcore/nm/js-vextensions.js";
import {GetAsync, Command} from "web-vcore/nm/mobx-graphlink.js";
import {MapNodePhrasing} from "../Store/db/nodePhrasings/@MapNodePhrasing.js";
import {GetNode} from "../Store/db/nodes.js";

@UserEdit
export class AddPhrasing extends Command<{phrasing: MapNodePhrasing}, string> {
	id: string;
	Validate() {
		const {phrasing} = this.payload;

		this.id = this.id ?? GenerateUUID();
		phrasing.creator = this.userInfo.id;
		phrasing.createdAt = Date.now();
		AssertValidate("MapNodePhrasing", phrasing, "MapNodePhrasing invalid");

		const node = GetNode(phrasing.node);
		Assert(node, `Node with id ${phrasing.node} does not exist.`);

		this.returnData = this.id;

	}

	GetDBUpdates() {
		const {phrasing} = this.payload;
		const updates = {
			[`nodePhrasings/${this.id}`]: phrasing,
		};
		return updates;
	}
}