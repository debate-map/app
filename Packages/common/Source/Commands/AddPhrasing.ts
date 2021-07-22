import {AddSchema, AssertValidate, dbp, GenerateUUID, GetAsync, Command, CommandMeta, SimpleSchema, DBHelper} from "web-vcore/nm/mobx-graphlink.js";
import {Assert} from "web-vcore/nm/js-vextensions.js";

import {UserEdit} from "../CommandMacros.js";
import {MapNodePhrasing} from "../DB/nodePhrasings/@MapNodePhrasing.js";
import {GetNode} from "../DB/nodes.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>({}),
	returnSchema: ()=>SimpleSchema({$id: {type: "string"}}),
})
export class AddPhrasing extends Command<{phrasing: MapNodePhrasing}, {id: string}> {
	Validate() {
		const {phrasing} = this.payload;

		phrasing.id = GenerateUUID();
		phrasing.creator = this.userInfo.id;
		phrasing.createdAt = Date.now();
		AssertValidate("MapNodePhrasing", phrasing, "MapNodePhrasing invalid");

		const node = GetNode(phrasing.node);
		Assert(node, `Node with id ${phrasing.node} does not exist.`);

		this.returnData = {id: phrasing.id};
	}

	DeclareDBUpdates(db: DBHelper) {
		const {phrasing} = this.payload;
		db.set(dbp`nodePhrasings/${phrasing.id}`, phrasing);
	}
}