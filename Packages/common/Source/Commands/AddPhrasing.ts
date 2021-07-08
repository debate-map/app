import {AddSchema, AssertValidate, dbp, GenerateUUID, GetAsync, Command} from "web-vcore/nm/mobx-graphlink.js";
import {Assert} from "web-vcore/nm/js-vextensions.js";

import {UserEdit} from "../CommandMacros.js";
import {MapNodePhrasing} from "../DB/nodePhrasings/@MapNodePhrasing.js";
import {GetNode} from "../DB/nodes.js";

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

	DeclareDBUpdates(db) {
		const {phrasing} = this.payload;
		db.set(dbp`nodePhrasings/${this.id}`, phrasing);
	}
}