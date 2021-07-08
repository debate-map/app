import {AssertValidate, Command} from "web-vcore/nm/mobx-graphlink.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";
import {MapNode} from "../DB/nodes/@MapNode.js";
import {MapNodeRevision} from "../DB/nodes/@MapNodeRevision.js";
import {AddChildNode} from "./AddChildNode.js";

type Payload = {
	mapID: string|n,
	argumentParentID: string, argumentNode: MapNode, argumentRevision: MapNodeRevision, argumentLink?: NodeChildLink,
	claimNode: MapNode, claimRevision: MapNodeRevision, claimLink?: NodeChildLink,
};

export class AddArgumentAndClaim extends Command<Payload, {argumentNodeID: string, argumentRevisionID: string, claimNodeID: string, claimRevisionID: string}> {
	sub_addArgument: AddChildNode;
	sub_addClaim: AddChildNode;
	Validate() {
		AssertValidate({
			properties: {
				mapID: {type: "string"},
				argumentParentID: {type: "string"}, argumentNode: {$ref: "MapNode_Partial"}, argumentRevision: {$ref: "MapNodeRevision_Partial"}, argumentLink: {$ref: NodeChildLink.name},
				claimNode: {$ref: "MapNode_Partial"}, claimRevision: {$ref: "MapNodeRevision_Partial"}, claimLink: {$ref: NodeChildLink.name},
			},
			required: ["mapID", "argumentParentID", "argumentNode", "argumentRevision", "claimNode", "claimRevision"],
		}, this.payload, "Payload invalid");

		const {mapID, argumentParentID, argumentNode, argumentRevision, argumentLink, claimNode, claimRevision, claimLink} = this.payload;

		this.sub_addArgument = this.sub_addArgument ?? new AddChildNode({
			mapID, parentID: argumentParentID, node: argumentNode, revision: argumentRevision, link: argumentLink,
		}).MarkAsSubcommand(this);
		this.sub_addArgument.Validate();
		//this.sub_addArgument.parent_oldData = argumentNode; // needed so add-argument sub knows to update the children-order prop of parent

		this.sub_addClaim = this.sub_addClaim ?? new AddChildNode({mapID, parentID: this.sub_addArgument.returnData.nodeID, node: claimNode, revision: claimRevision, link: claimLink}).MarkAsSubcommand(this);
		/* this.sub_addClaim.lastNodeID_addAmount = 1;
		this.sub_addClaim.lastNodeRevisionID_addAmount = 1; */
		this.sub_addClaim.Validate();
		this.sub_addClaim.parent_oldData = argumentNode; // needed so add-claim sub knows to update the children-order prop of argument

		this.returnData = {
			argumentNodeID: this.sub_addArgument.sub_addNode.nodeID,
			argumentRevisionID: this.sub_addArgument.sub_addNode.sub_addRevision.revisionID,
			claimNodeID: this.sub_addClaim.sub_addNode.nodeID,
			claimRevisionID: this.sub_addClaim.sub_addNode.sub_addRevision.revisionID,
		};
	}

	/*GetDBUpdates(db) {
		const updates = [] as DBUpdate[];
		updates.push(...this.sub_addArgument.GetDBUpdates());
		updates.push(...this.sub_addClaim.GetDBUpdates());
		return updates;
	}*/
	DeclareDBUpdates(db) {
		db.add(this.sub_addArgument.GetDBUpdates());
		db.add(this.sub_addClaim.GetDBUpdates());
	}
}