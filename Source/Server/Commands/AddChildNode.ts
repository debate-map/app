import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {MapNode, ThesisForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import { UserEdit, MapEdit } from "Server/CommandMacros";
import AddNode from "./AddNode";

@MapEdit
@UserEdit
export default class AddChildNode extends Command<{mapID: number, node: MapNode, link?: ChildEntry, metaThesisNode?: MapNode, asMapRoot?: boolean}> {
	Validate_Early() {
		let {node, link, metaThesisNode, asMapRoot} = this.payload;
		if (!asMapRoot) {
			Assert(node.parents && node.parents.VKeys().length == 1, `Node must have exactly one parent`);
		}
	}

	sub_addNode: AddNode;
	parentID: number;
	parent_oldChildrenOrder: number[];
	async Prepare() {
		let {node, link, metaThesisNode, asMapRoot} = this.payload;

		this.sub_addNode = new AddNode({node, metaThesisNode});
		this.sub_addNode.asSubcommand = true;
		await this.sub_addNode.Prepare();

		if (!asMapRoot) {
			this.parentID = node.parents.VKeys(true)[0].ToInt();
			this.parent_oldChildrenOrder = await GetDataAsync("nodes", this.parentID, "childrenOrder") as number[];
		}

		this.returnData = this.sub_addNode.nodeID;
	}
	async Validate() {
		let {node, link, metaThesisNode, asMapRoot} = this.payload;
		await this.sub_addNode.Validate();
		if (!asMapRoot) {
			AssertValidate(`ChildEntry`, link, `Link invalid`);
		}
	}
	
	GetDBUpdates() {
		let {node, link, metaThesisNode, asMapRoot} = this.payload;
		let updates = this.sub_addNode.GetDBUpdates();

		let newUpdates = {};
		// add as child of parent
		if (!asMapRoot) {
			newUpdates[`nodes/${this.parentID}/children/${this.sub_addNode.nodeID}`] = link;
			if (this.parent_oldChildrenOrder) {
				newUpdates[`nodes/${this.parentID}/childrenOrder`] = this.parent_oldChildrenOrder.concat([this.sub_addNode.nodeID]);
			}
		}

		return MergeDBUpdates(updates, newUpdates);
	}
}