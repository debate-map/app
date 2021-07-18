import {AssertV, AssertValidate, AssertValidate_Full, Command, CommandMeta, GenerateUUID, GetSchemaJSON} from "web-vcore/nm/mobx-graphlink.js";
import {MapNode} from "../DB/nodes/@MapNode.js";
import {MapNodeRevision} from "../DB/nodes/@MapNodeRevision.js";
import {AddNodeRevision} from "./AddNodeRevision.js";

/** Do not try to use this from client. This is only to be used internally, by higher-level commands -- usually AddChildNode. */
@CommandMeta({
	payloadSchema: ()=>({}),
})
export class AddNode extends Command<{mapID: string|n, node: MapNode, revision: MapNodeRevision}, {}> {
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

	DeclareDBUpdates(db) {
		const {node} = this.payload;

		// add node
		db.set(`nodes/${this.nodeID}`, node);

		// add as parent of (pre-existing) children
		/*for (const childID of CE(node.children || {}).VKeys()) {
			db.set(`nodes/${childID}/.parents/.${this.nodeID}`, {_: true});
		}*/

		db.add(this.sub_addRevision.GetDBUpdates());
	}
}