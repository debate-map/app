import {Assert, E} from "web-vcore/nm/js-vextensions.js";
import {AssertV, AssertValidate, Command, CommandMeta, DBHelper, dbp, DeriveJSONSchema, GenerateUUID, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit, UserEdit} from "../CommandMacros.js";
import {AddArgumentAndClaim} from "../Commands.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";
import {GetNode} from "../DB/nodes.js";
import {MapNode, Polarity} from "../DB/nodes/@MapNode.js";
import {MapNodeRevision} from "../DB/nodes/@MapNodeRevision.js";
import {MapNodeType} from "../DB/nodes/@MapNodeType.js";
import {AddNode} from "./AddNode.js";
import {LinkNode} from "./LinkNode.js";

@MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$mapID: {$ref: "UUID"},
		$parentID: {type: ["null", "string"]},
		$node: {$ref: "MapNode_Partial"},
		$revision: {$ref: "MapNodeRevision_Partial"},
		//link: {$ref: NodeChildLink.name},
		link: DeriveJSONSchema(NodeChildLink, {makeOptional: ["parent", "child"]}),
		asMapRoot: {type: "boolean"},
	}),
	returnSchema: ()=>SimpleSchema({
		$nodeID: {$ref: "UUID"},
		$revisionID: {$ref: "UUID"},
		$linkID: {$ref: "UUID"},
	}),
})
export class AddChildNode extends Command<{mapID: string|n, parentID: string, node: MapNode, revision: MapNodeRevision, link?: NodeChildLink}, {nodeID: string, revisionID: string, linkID: string}> {
	sub_addNode: AddNode;
	sub_addLink: LinkNode;
	parent_oldData: MapNode|n;
	Validate() {
		const {mapID, parentID, node, revision} = this.payload;
		//const link = this.payload.link = this.payload.link ?? {} as NodeChildLink;
		this.payload.link = E(new NodeChildLink(), this.payload.link);
		this.payload.link.parent = parentID;

		this.sub_addNode = this.sub_addNode ?? new AddNode({mapID, node, revision}).MarkAsSubcommand(this);
		this.sub_addNode.Validate();
		this.payload.link.child = this.sub_addNode.payload.node.id;

		this.sub_addLink = this.sub_addLink ?? new LinkNode({mapID, link: this.payload.link}).MarkAsSubcommand(this);
		this.sub_addLink.Validate();

		const isAddClaimSub = this.parentCommand instanceof AddArgumentAndClaim && this.parentCommand.sub_addClaim == this;
		if (isAddClaimSub) {
			Assert(this.parent_oldData != null);
		} else {
			// this.parent_oldChildrenOrder = await GetDataAsync('nodes', parentID, '.childrenOrder') as number[];
			this.parent_oldData = GetNode.NN(parentID)!;
		}

		this.returnData = {
			nodeID: this.sub_addNode.payload.node.id,
			revisionID: this.sub_addNode.sub_addRevision.payload.revision.id,
			linkID: this.sub_addLink.payload.link.id!,
		};
	}

	DeclareDBUpdates(db: DBHelper) {
		db.add(this.sub_addNode.GetDBUpdates(db));
		db.add(this.sub_addLink.GetDBUpdates(db));
	}
}