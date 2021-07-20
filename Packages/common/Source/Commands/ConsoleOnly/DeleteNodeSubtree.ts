import {Command, DBHelper} from "web-vcore/nm/mobx-graphlink.js";
import {MapNode} from "../../DB/nodes/@MapNode.js";
import {DeleteNode} from "../DeleteNode.js";

/*
==========
temp1 = await RR.GetDBUpdatesFor_DeleteNodeSubtree(NODE_ID, 200);

// optional
//temp2 = temp1.Pairs().filter(a=>!a.key.includes("mapNodeEditTimes")).length

await RR.ApplyDBUpdates({}, temp1)
==========
*/

/*export function GetNodesInSubtree(rootNodeID: string, runInfo = {nodesVisited: new Set<string>()}) {
	if (runInfo.nodesVisited.has(rootNodeID)) return [];
	runInfo.nodesVisited.add(rootNodeID);

	const rootNode = GetNode(rootNodeID);
	if (rootNode == null) return null;

	const result = [];
	for (const childID of CE(rootNode.children || {}).VKeys()) {
		const subtreeNodes = GetNodesInSubtree(childID, runInfo);
		if (subtreeNodes == null) return null; // if any subtree contents are not yet loaded, have the whole call resolve to null
		result.push(...subtreeNodes);
	}
	// add self last, so that deeper nodes are deleted first
	result.push(rootNode);
	return result;
}*/

export class DeleteNodeSubtree extends Command<{nodeID: string, maxDeletes: number}, {}> {
	nodesInSubtree: MapNode[];

	subs_deleteNodes: DeleteNode[];
	Validate() {
		/*AssertValidate({
			properties: {
				nodeID: {type: "string"},
				maxDeletes: {type: "number"},
			},
			required: ["nodeID"],
		}, this.payload, "Payload invalid");
		const {nodeID, maxDeletes} = this.payload;

		this.nodesInSubtree = GetNodesInSubtree(nodeID);
		AssertV(this.nodesInSubtree.length <= maxDeletes, `Length of nodes in subtree (${this.nodesInSubtree.length}) is greater than the max-deletes limit (${maxDeletes}).`);

		this.subs_deleteNodes = this.nodesInSubtree.map(node=>{
			const deleteNodeCommand = new DeleteNode({nodeID: node.id}).MarkAsSubcommand(this);
			deleteNodeCommand.parentsToIgnore = this.nodesInSubtree.map(a=>a.id);
			deleteNodeCommand.childrenToIgnore = this.nodesInSubtree.map(a=>a.id);
			deleteNodeCommand.Validate();
			return deleteNodeCommand;
		});*/
	}

	DeclareDBUpdates(db: DBHelper) {
		for (const deleteNodeCommand of this.subs_deleteNodes) {
			db.add(deleteNodeCommand.GetDBUpdates());
		}
	}
}