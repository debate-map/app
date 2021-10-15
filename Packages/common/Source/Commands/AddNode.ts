import {AssertV, AssertValidate, AssertValidate_Full, Command, CommandMeta, DBHelper, dbp, GenerateUUID, GetSchemaJSON, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {MapNode} from "../DB/nodes/@MapNode.js";
import {MapNodeRevision} from "../DB/nodes/@MapNodeRevision.js";
import {AddNodeRevision} from "./AddNodeRevision.js";

/** Do not try to use this from client. This is only to be used internally, by higher-level commands -- usually AddChildNode. */
@CommandMeta({
	exposeToGraphQL: false, // server-internal
	payloadSchema: ()=>SimpleSchema({}), // not needed
})
export class AddNode extends Command<{mapID: string|n, node: MapNode, revision: MapNodeRevision}, {}> {
	sub_addRevision: AddNodeRevision;

	//parentID: string;
	//parent_oldChildrenOrder: number[];
	Validate() {
		const {mapID, node, revision} = this.payload;
		//AssertV(revision.node == null || revision.node == node.id, "Cannot specify revision's node-id. It will be generated automatically.");
		if (this.parentCommand == null) { // todo: maybe switch this to check if this is the "first call" (ie. to avoid assert fails after looping caused vals to be populated)
			AssertV(node.id == null, "Cannot specify node's id. It will be generated automatically.");
			AssertV(revision.node == null, "Cannot specify revision's node-id. It will be generated automatically.");
		}

		node.id = this.GenerateUUID_Once("node.id");
		node.creator = this.userInfo.id;
		node.createdAt = Date.now();
		revision.node = node.id;

		this.sub_addRevision = this.sub_addRevision ?? new AddNodeRevision({mapID, revision}).MarkAsSubcommand(this);
		this.sub_addRevision.Validate();

		// if sub of AddChildNode for new argument, ignore the "childrenOrder" prop requirement (gets added by later link-impact-node subcommand)
		if (this.parentCommand) {
			const mapNodeSchema = GetSchemaJSON("MapNode").ExcludeKeys("allOf");
			AssertValidate_Full(mapNodeSchema, "MapNode", node, "Node invalid");
		} else {
			AssertValidate("MapNode", node, "Node invalid");
		}
	}

	DeclareDBUpdates(db: DBHelper) {
		const {node} = this.payload;

		// add node
		db.set(dbp`nodes/${node.id}`, node);

		// add as parent of (pre-existing) children
		/*for (const childID of CE(node.children || {}).VKeys()) {
			db.set(dbp`nodes/${childID}/.parents/.${this.nodeID}`, {_: true});
		}*/

		db.add(this.sub_addRevision.GetDBUpdates(db));
	}
}