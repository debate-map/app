import {E} from "web-vcore/nm/js-vextensions.js";
import {AssertV, AssertValidate, Command, CommandMeta, DBHelper, dbp, DeriveJSONSchema, GenerateUUID, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit, UserEdit} from "../CommandMacros.js";
import {AddArgumentAndClaim} from "../Commands.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";
import {GetNode} from "../DB/nodes.js";
import {MapNode, Polarity} from "../DB/nodes/@MapNode.js";
import {MapNodeRevision} from "../DB/nodes/@MapNodeRevision.js";
import {MapNodeType} from "../DB/nodes/@MapNodeType.js";
import {AddNode} from "./AddNode.js";

@MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$mapID: {$ref: "UUID"},
		$parentID: {type: ["null", "string"]},
		$node: {$ref: "MapNode_Partial"},
		$revision: {$ref: "MapNodeRevision_Partial"},
		//link: {$ref: NodeChildLink.name},
		link: DeriveJSONSchema(NodeChildLink.name, {makeOptional: ["parent", "child"]}),
		asMapRoot: {type: "boolean"},
	}),
	returnSchema: ()=>SimpleSchema({
		$nodeID: {$ref: "UUID"},
		$revisionID: {$ref: "UUID"},
	}),
})
export class AddChildNode extends Command<{mapID: string|n, parentID: string, node: MapNode, revision: MapNodeRevision, link?: NodeChildLink, asMapRoot?: boolean}, {nodeID: string, revisionID: string}> {
	sub_addNode: AddNode;
	parent_oldData: MapNode;
	Validate() {
		const {mapID, parentID, node, revision, asMapRoot} = this.payload;
		const link = this.payload.link = this.payload.link ?? {} as NodeChildLink;

		this.sub_addNode = this.sub_addNode ?? new AddNode({mapID, node, revision}).MarkAsSubcommand(this);
		this.sub_addNode.Validate();

		const isAddClaimSub = this.parentCommand instanceof AddArgumentAndClaim && this.parentCommand.sub_addClaim == this;
		if (!asMapRoot && !isAddClaimSub) {
			// this.parent_oldChildrenOrder = await GetDataAsync('nodes', parentID, '.childrenOrder') as number[];
			this.parent_oldData = GetNode.NN(parentID)!;
		}

		link.id = this.GenerateUUID_Once("link.id");
		link.parent = parentID;
		link.child = this.sub_addNode.payload.node.id;
		link.c_parentType = this.parent_oldData.type;
		link.c_childType = node.type;
		if (node.type == MapNodeType.argument) {
			AssertV(this.payload.link.polarity != null, "An argument node must have its polarity specified in its parent-link.");
		}

		this.returnData = {
			nodeID: this.sub_addNode.payload.node.id,
			revisionID: this.sub_addNode.sub_addRevision.payload.revision.id,
		};
	}

	DeclareDBUpdates(db: DBHelper) {
		const {parentID, link, asMapRoot} = this.payload;
		db.add(this.sub_addNode.GetDBUpdates());

		// add as child of parent
		if (!asMapRoot) {
			/*db.set(dbp`nodes/${parentID}/.children/.${this.sub_addNode.nodeID}`, link);
			// if parent node is using manual children-ordering, update that array
			if (this.parent_oldData?.childrenOrder) {
				db.set(dbp`nodes/${parentID}/.childrenOrder`, (this.parent_oldData.childrenOrder || []).concat([this.sub_addNode.nodeID]));
			}*/
			db.set(dbp`nodeChildLinks/${link!.id}`, link);
		}
	}
}