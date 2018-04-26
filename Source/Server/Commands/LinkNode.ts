import { GetAsync } from "Frame/Database/DatabaseHelpers";
import { MapEdit } from "Server/CommandMacros";
import { GetNode } from "Store/firebase/nodes";
import { Assert, E } from "js-vextensions";
import { ClaimForm, MapNode, Polarity } from "../../Store/firebase/nodes/@MapNode";
import { MapNodeType } from "../../Store/firebase/nodes/@MapNodeType";
import { Command } from "../Command";
import { UserEdit } from "../CommandMacros";

@MapEdit
@UserEdit
export default class LinkNode extends Command<{mapID: number, parentID: number, childID: number, childForm?: ClaimForm, childPolarity?: Polarity}> {
	Validate_Early() {
		let {parentID, childID} = this.payload
		Assert(parentID != childID, "Parent-id and child-id cannot be the same!");
	}
	
	parent_oldData: MapNode;
	/*async Prepare(parent_oldChildrenOrder_override?: number[]) {
		let {parentID, childID, childForm} = this.payload;
		this.parent_oldChildrenOrder = parent_oldChildrenOrder_override || await GetDataAsync(`nodes/${parentID}/childrenOrder`) as number[];
	}*/
	async Prepare() {
		let {parentID, childID} = this.payload;
		this.parent_oldData = await GetAsync(()=>GetNode(parentID));
	}
	async Validate() {
		let {parentID, childID} = this.payload;
		Assert(this.parent_oldData || this.asSubcommand, "Parent does not exist!");
		if (this.parent_oldData) {
			Assert(this.parent_oldData.childrenOrder == null || !this.parent_oldData.childrenOrder.Contains(childID), `Node #${childID} is already a child of node #${parentID}.`);
		}
	}

	GetDBUpdates() {
		let {parentID, childID, childForm, childPolarity} = this.payload;

		let updates = {};
		// add parent as parent-of-child
		updates[`nodes/${childID}/parents/${parentID}`] = {_: true};
		// add child as child-of-parent
		updates[`nodes/${parentID}/children/${childID}`] = E(
			{_: true},
			childForm && {form: childForm},
			childPolarity && {polarity: childPolarity},
		);
		if (this.parent_oldData && this.parent_oldData.type == MapNodeType.Argument) {
			updates[`nodes/${parentID}/childrenOrder`] = (this.parent_oldData.childrenOrder || []).concat([childID]);
		}
		return updates;
	}
}