import {GetNodeParentsAsync} from "../../Store/firebase/nodes";
import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";

export default class LinkNode extends Command<{parentID: number, childID: number, childForm: ThesisForm}> {
	parent_oldChildrenOrder: number[];
	/*async Prepare(parent_oldChildrenOrder_override?: number[]) {
		let {parentID, childID, childForm} = this.payload;
		this.parent_oldChildrenOrder = parent_oldChildrenOrder_override || await GetDataAsync(`nodes/${parentID}/childrenOrder`) as number[];
	}*/
	async Prepare() {
		let {parentID, childID, childForm} = this.payload;
		this.parent_oldChildrenOrder = await GetDataAsync(`nodes/${parentID}/childrenOrder`) as number[];
	}
	async Validate() {
		let {parentID, childID, childForm} = this.payload;
		Assert(this.parent_oldChildrenOrder == null || !this.parent_oldChildrenOrder.Contains(childID), `Node #${childID} is already a child of node #${parentID}.`);
	}

	GetDBUpdates() {
		let {parentID, childID, childForm} = this.payload;

		let updates = {};
		// add parent as parent-of-child
		updates[`nodes/${childID}/parents/${parentID}`] = {_: true};
		// add child as child-of-parent
		updates[`nodes/${parentID}/children/${childID}`] = E({_: true}, childForm && {form: childForm});
		if (this.parent_oldChildrenOrder) {
			updates[`nodes/${parentID}/childrenOrder`] = this.parent_oldChildrenOrder.concat([childID]);
		}
		return updates;
	}
}