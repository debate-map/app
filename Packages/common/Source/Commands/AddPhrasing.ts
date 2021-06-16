import {UserEdit} from "../CommandMacros";
import {AddSchema, AssertValidate, GenerateUUID} from "mobx-firelink";
import {Assert} from "js-vextensions";
import {Command_Old, GetAsync, Command} from "mobx-firelink";
import {MapNodePhrasing} from "../Store/firebase/nodePhrasings/@MapNodePhrasing";
import {GetNode} from "../Store/firebase/nodes";

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