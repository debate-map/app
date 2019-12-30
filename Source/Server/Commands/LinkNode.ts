import {MapEdit} from "Server/CommandMacros";
import {GetNode} from "Store/firebase/nodes";
import {Assert, E} from "js-vextensions";
import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {GetMap} from "Store/firebase/maps";
import {ClaimForm, MapNode, Polarity} from "../../Store/firebase/nodes/@MapNode";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {UserEdit} from "../CommandMacros";
import {LinkNode_HighLevel} from "./LinkNode_HighLevel";

@MapEdit
@UserEdit
export class LinkNode extends Command<{mapID: string, parentID: string, childID: string, childForm?: ClaimForm, childPolarity?: Polarity}, {}> {
	child_oldData: MapNode;
	parent_oldData: MapNode;
	/* async Prepare(parent_oldChildrenOrder_override?: number[]) {
		let {parentID, childID, childForm} = this.payload;
		this.parent_oldChildrenOrder = parent_oldChildrenOrder_override || await GetDataAsync(`nodes/${parentID}/.childrenOrder`) as number[];
	} */
	Validate() {
		const {parentID, childID} = this.payload;
		AssertV(parentID != childID, "Parent-id and child-id cannot be the same!");

		this.child_oldData = GetNode(childID);
		AssertV(this.child_oldData || this.parentCommand != null, "Child does not exist!");
		this.parent_oldData =
			(this.parentCommand instanceof LinkNode_HighLevel && this == this.parentCommand.sub_linkToNewParent ? this.parentCommand.sub_addArgumentWrapper?.payload.node : null)
			?? GetNode(parentID);
		AssertV(this.parent_oldData || this.parentCommand != null, "Parent does not exist!");

		if (this.parent_oldData) {
			AssertV(this.parent_oldData.childrenOrder == null || !this.parent_oldData.childrenOrder.Contains(childID), `Node #${childID} is already a child of node #${parentID}.`);
		}

		if (this.child_oldData?.ownerMapID != null) {
			AssertV(this.parent_oldData?.ownerMapID == this.child_oldData.ownerMapID, `Cannot paste private node #${childID} into a map not matching its owner map (${this.child_oldData.ownerMapID}).`);
			/* const newMap = GetMap(this.parent_oldData.ownerMapID);
			AssertV(newMap, 'newMap not yet loaded.');
			if (newMap.requireMapEditorsCanEdit) */
		}
	}

	GetDBUpdates() {
		const {parentID, childID, childForm, childPolarity} = this.payload;

		const updates = {};
		// add parent as parent-of-child
		updates[`nodes/${childID}/.parents/.${parentID}`] = {_: true};
		// add child as child-of-parent
		updates[`nodes/${parentID}/.children/.${childID}`] = E(
			{_: true},
			childForm && {form: childForm},
			childPolarity && {polarity: childPolarity},
		);
		if (this.parent_oldData && this.parent_oldData.type == MapNodeType.Argument) {
			updates[`nodes/${parentID}/.childrenOrder`] = (this.parent_oldData.childrenOrder || []).concat([childID]);
		}
		return updates;
	}
}