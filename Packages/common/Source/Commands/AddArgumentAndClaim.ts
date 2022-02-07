import {AssertValidate, Command, CommandMeta, CommandRunInfo, DBHelper, DeriveJSONSchema, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {CommandRunMeta} from "../CommandMacros/CommandRunMeta.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";
import {MapNode} from "../DB/nodes/@MapNode.js";
import {MapNodeRevision} from "../DB/nodes/@MapNodeRevision.js";
import {AddChildNode} from "./AddChildNode.js";

type Payload = {
	mapID: string|n,
	argumentParentID: string, argumentNode: MapNode, argumentRevision: MapNodeRevision, argumentLink?: NodeChildLink,
	claimNode: MapNode, claimRevision: MapNodeRevision, claimLink?: NodeChildLink,
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
	payloadSchema: ()=>SimpleSchema({
		$mapID: {type: "string"},
		$argumentParentID: {type: "string"}, $argumentNode: {$ref: "MapNode_Partial"}, $argumentRevision: {$ref: "MapNodeRevision_Partial"},
		//argumentLink: {$ref: NodeChildLink.name},
		argumentLink: DeriveJSONSchema(NodeChildLink, {makeOptional: ["parent", "child"]}),
		$claimNode: {$ref: "MapNode_Partial"}, $claimRevision: {$ref: "MapNodeRevision_Partial"},
		//claimLink: {$ref: NodeChildLink.name},
		claimLink: DeriveJSONSchema(NodeChildLink, {makeOptional: ["parent", "child"]}),
	}),
	returnSchema: ()=>SimpleSchema({
		$argumentNodeID: {$ref: "UUID"},
		$argumentRevisionID: {$ref: "UUID"},
		$claimNodeID: {$ref: "UUID"},
		$claimRevisionID: {$ref: "UUID"},
	}),
})
export class AddArgumentAndClaim extends Command<Payload, {argumentNodeID: string, argumentRevisionID: string, claimNodeID: string, claimRevisionID: string}> {
	sub_addArgument: AddChildNode;
	sub_addClaim: AddChildNode;
	Validate() {
		const {mapID, argumentParentID, argumentNode, argumentRevision, argumentLink, claimNode, claimRevision, claimLink} = this.payload;

		this.IntegrateSubcommand(()=>this.sub_addArgument, null, ()=>new AddChildNode({
			mapID, parentID: argumentParentID, node: argumentNode, revision: argumentRevision, link: argumentLink,
		}));

		this.IntegrateSubcommand(()=>this.sub_addClaim, null, ()=>new AddChildNode({mapID, parentID: this.sub_addArgument.returnData.nodeID, node: claimNode, revision: claimRevision, link: claimLink}));

		this.returnData = {
			argumentNodeID: this.sub_addArgument.sub_addNode.payload.node.id,
			argumentRevisionID: this.sub_addArgument.sub_addNode.sub_addRevision.payload.revision.id,
			claimNodeID: this.sub_addClaim.sub_addNode.payload.node.id,
			claimRevisionID: this.sub_addClaim.sub_addNode.sub_addRevision.payload.revision.id,
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