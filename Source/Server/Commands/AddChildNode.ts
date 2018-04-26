import { MapEdit, UserEdit } from "Server/CommandMacros";
import { MapNodeRevision } from "Store/firebase/nodes/@MapNodeRevision";
import { Assert } from "js-vextensions";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { ChildEntry, MapNode } from "../../Store/firebase/nodes/@MapNode";
import { Command, MergeDBUpdates } from "../Command";
import AddNode from "./AddNode";

@MapEdit
@UserEdit
export default class AddChildNode extends Command
		<{mapID: number, node: MapNode, revision: MapNodeRevision, link?: ChildEntry, asMapRoot?: boolean}> {
	Validate_Early() {
		let {node, revision, link, asMapRoot} = this.payload;
		if (!asMapRoot) {
			Assert(node.parents && node.parents.VKeys().length == 1, `Node must have exactly one parent`);
		}
	}

	sub_addNode: AddNode;
	parentID: number;
	parent_oldChildrenOrder: number[];
	async Prepare() {
		let {mapID, node, revision, link, asMapRoot} = this.payload;

		this.sub_addNode = new AddNode({mapID, node, revision}).MarkAsSubcommand();
		await this.sub_addNode.Prepare();

		this.payload.link = link || {_: true};

		if (!asMapRoot) {
			this.parentID = node.parents.VKeys(true)[0].ToInt();
			this.parent_oldChildrenOrder = await GetDataAsync("nodes", this.parentID, "childrenOrder") as number[];
		}

		this.returnData = {
			nodeID: this.sub_addNode.nodeID,
			revisionID: this.sub_addNode.sub_addRevision.revisionID,
		};
	}
	async Validate() {
		let {node, link, asMapRoot} = this.payload;
		await this.sub_addNode.Validate();
		if (!asMapRoot) {
			AssertValidate(`ChildEntry`, link, `Link invalid`);
		}
	}
	
	GetDBUpdates() {
		let {node, link, asMapRoot} = this.payload;
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