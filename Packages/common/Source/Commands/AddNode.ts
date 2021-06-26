import {AssertV, AssertValidate, AssertValidate_Full, Command, GenerateUUID, GetSchemaJSON, MergeDBUpdates} from "web-vcore/nm/mobx-graphlink";
import {MapNode} from "../Store/db/nodes/@MapNode";
import {MapNodeRevision} from "../Store/db/nodes/@MapNodeRevision";
import {AddNodeRevision} from "./AddNodeRevision";
import {CE} from "web-vcore/nm/js-vextensions";

/** Do not use this from client-side code. This is only to be used internally, by higher-level commands -- usually AddChildNode. */
export class AddNode extends Command<{mapID: string, node: MapNode, revision: MapNodeRevision}, {}> {
	sub_addRevision: AddNodeRevision;

	nodeID: string;
	//parentID: string;
	//parent_oldChildrenOrder: number[];
	Validate() {
		const {mapID, node, revision} = this.payload;
		AssertV(revision.node == null || revision.node == this.nodeID, "Cannot specify revision's node-id. It will be generated automatically.");

		this.nodeID = this.nodeID ?? GenerateUUID();
		node.creator = this.userInfo.id;
		node.createdAt = Date.now();
		revision.node = this.nodeID;

		this.sub_addRevision = this.sub_addRevision ?? new AddNodeRevision({mapID, revision}).MarkAsSubcommand(this);
		this.sub_addRevision.Validate();

		// if sub of AddChildNode for new argument, ignore the "childrenOrder" prop requirement (gets added by later link-impact-node subcommand)
		if (this.parentCommand) {
			const mapNodeSchema = GetSchemaJSON("MapNode").Excluding("allOf");
			AssertValidate_Full(mapNodeSchema, "MapNode", node, "Node invalid");
		} else {
			AssertValidate("MapNode", node, "Node invalid");
		}
	}

	GetDBUpdates() {
		const {node} = this.payload;

		let updates = {};
		// add node
		updates[`nodes/${this.nodeID}`] = node;

		// add as parent of (pre-existing) children
		/*for (const childID of CE(node.children || {}).VKeys()) {
			updates[`nodes/${childID}/.parents/.${this.nodeID}`] = {_: true};
		}*/

		updates = MergeDBUpdates(updates, this.sub_addRevision.GetDBUpdates());

		return updates;
	}
}