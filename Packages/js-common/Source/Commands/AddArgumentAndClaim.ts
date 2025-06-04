import {Command, CommandMeta, DBHelper, DeriveJSONSchema, SimpleSchema} from "mobx-graphlink";
import {NodeLink} from "../DB/nodeLinks/@NodeLink.js";
import {NodeL1} from "../DB/nodes/@Node.js";
import {NodeRevision} from "../DB/nodes/@NodeRevision.js";
import {AddChildNode} from "./AddChildNode.js";

type Payload = {
	mapID: string|n,
	argumentParentID: string, argumentNode: NodeL1, argumentRevision: NodeRevision, argumentLink?: NodeLink,
	claimNode: NodeL1, claimRevision: NodeRevision, claimLink?: NodeLink,
};

/*@CommandRunMeta({
	record: true,
	canShowInStream: true,
	rlsTargetPaths: [
		{table: "nodes", fieldPath: ["returnData", "argumentNodeID"]},
		{table: "nodes", fieldPath: ["returnData", "claimNodeID"]},
	],
})*/
@CommandMeta({
	inputSchema: ()=>SimpleSchema({
		$mapID: {type: "string"},
		$argumentParentID: {type: "string"}, $argumentNode: {$ref: "Node_Partial"}, $argumentRevision: {$ref: "NodeRevision_Partial"},
		//argumentLink: {$ref: NodeLink.name},
		argumentLink: DeriveJSONSchema(NodeLink, {makeOptional: ["parent", "child"]}),
		$claimNode: {$ref: "Node_Partial"}, $claimRevision: {$ref: "NodeRevision_Partial"},
		//claimLink: {$ref: NodeLink.name},
		claimLink: DeriveJSONSchema(NodeLink, {makeOptional: ["parent", "child"]}),
	}),
	responseSchema: ()=>SimpleSchema({
		$argumentNodeID: {$ref: "UUID"},
		$argumentRevisionID: {$ref: "UUID"},
		$claimNodeID: {$ref: "UUID"},
		$claimRevisionID: {$ref: "UUID"},
		$doneAt: {type: "number"},
	}),
})
export class AddArgumentAndClaim extends Command<Payload, {argumentNodeID: string, argumentRevisionID: string, claimNodeID: string, claimRevisionID: string, doneAt: number}> {
	sub_addArgument: AddChildNode;
	sub_addClaim: AddChildNode;
	Validate() {
		const {mapID, argumentParentID, argumentNode, argumentRevision, argumentLink, claimNode, claimRevision, claimLink} = this.input;

		this.IntegrateSubcommand(()=>this.sub_addArgument, null, ()=>new AddChildNode({
			mapID, parentID: argumentParentID, node: argumentNode, revision: argumentRevision, link: argumentLink,
		}), a=>a.recordAsNodeEdit = false); // don't record the argument-node's creation as a node-edit, as it'll confuse people (ie. adding one argument, and seeing a marker for "+2" new-nodes)

		this.IntegrateSubcommand(()=>this.sub_addClaim, null, ()=>new AddChildNode({mapID, parentID: this.sub_addArgument.response.nodeID, node: claimNode, revision: claimRevision, link: claimLink}));

		this.response = {
			argumentNodeID: this.sub_addArgument.sub_addNode.input.node.id,
			argumentRevisionID: this.sub_addArgument.sub_addNode.sub_addRevision.input.revision.id,
			claimNodeID: this.sub_addClaim.sub_addNode.input.node.id,
			claimRevisionID: this.sub_addClaim.sub_addNode.sub_addRevision.input.revision.id,
			doneAt: Date.now(),
		};
	}

	/*GetDBUpdates(db) {
		const updates = [] as DBUpdate[];
		updates.push(...this.sub_addArgument.GetDBUpdates(db));
		updates.push(...this.sub_addClaim.GetDBUpdates(db));
		return updates;
	}*/
	DeclareDBUpdates(db: DBHelper) {
		db.add(this.sub_addArgument.GetDBUpdates(db));
		db.add(this.sub_addClaim.GetDBUpdates(db));
	}
}