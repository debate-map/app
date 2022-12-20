import {E, ObjectCE} from "web-vcore/nm/js-vextensions.js";
import {AssertV, Command, CommandMeta, DBHelper, SimpleSchema, UUID} from "web-vcore/nm/mobx-graphlink.js";
import {NodeLink} from "../DB/nodeLinks/@NodeLink.js";
import {GetMap} from "../DB/maps.js";
import {Map} from "../DB/maps/@Map.js";
import {GetHighestLexoRankUnderParent, GetNodeLinks} from "../DB/nodeLinks.js";
import {GetChildGroup, GetNode, GetParentNodeID, GetParentNodeL3, CheckLinkIsValid} from "../DB/nodes.js";
import {GetNodeL2, GetNodeL3} from "../DB/nodes/$node.js";
import {ClaimForm, NodeL1, Polarity} from "../DB/nodes/@Node.js";
import {NodeRevision} from "../DB/nodes/@NodeRevision.js";
import {ChildGroup, NodeType} from "../DB/nodes/@NodeType.js";
import {SearchUpFromNodeForNodeMatchingX} from "../Utils/DB/PathFinder.js";
import {AddChildNode} from "./AddChildNode.js";
import {DeleteNode} from "./DeleteNode.js";
import {LinkNode} from "./LinkNode.js";
import {UnlinkNode} from "./UnlinkNode.js";
import {VLexoRank} from "../Utils/General/LexoRank.js";

// todo: eventually retire this Command, once TransferNodes has been developed enough to cover all this one's use-cases

export function CreateLinkCommand(mapID: UUID|n, draggedNodePath: string, dropOnNodePath: string, dropOnChildGroup: ChildGroup, polarity: Polarity, asCopy: boolean) {
	const draggedNode = GetNodeL3(draggedNodePath);
	const dropOnNode = GetNodeL3(dropOnNodePath);
	if (draggedNode == null || dropOnNode == null) return null;

	// const draggedNode_parent = GetParentNodeL3(draggedNodePath);
	const dropOnNode_parent = GetParentNodeL3(dropOnNodePath);
	//const childGroup = GetChildGroup(dropOnNode.type, dropOnNode_parent?.type);
	const formForClaimChildren = dropOnNode.type == NodeType.category ? ClaimForm.question : ClaimForm.base;

	return new LinkNode_HighLevel({
		mapID, oldParentID: GetParentNodeID(draggedNodePath)!, newParentID: dropOnNode.id, nodeID: draggedNode.id,
		newForm: draggedNode.type == NodeType.claim ? formForClaimChildren : null,
		newPolarity: polarity,
		//createWrapperArg: childGroup != ChildGroup.generic || !dropOnNode.multiPremiseArgument,
		//createWrapperArg: true, // todo
		childGroup: dropOnChildGroup,
		unlinkFromOldParent: !asCopy, deleteEmptyArgumentWrapper: true,
	}.OmitNull());
}

type Payload = {
	mapID?: string|n, oldParentID?: string|n, newParentID: string, nodeID: string,
	newForm?: ClaimForm|n, newPolarity?: Polarity|n,
	//createWrapperArg?: boolean,
	childGroup: ChildGroup,
	//linkAsArgument?: boolean,
	unlinkFromOldParent?: boolean, deleteEmptyArgumentWrapper?: boolean
};

const IDIsOfNodeThatIsRootOfMap = id=>GetNode(id)?.rootNodeForMap != null;

/*export function CheckValidityOfChildTypeInChildGroup(parentType: NodeType, childGroup: ChildGroup, childType: NodeType) {
	if (parentType == NodeType.argument && childGroup == ChildGroup.generic && childType != NodeType.claim) {
		return "Where parent is an argument, and child-group is generic, a claim child is expected.";
	}
	if (childGroup.IsOneOf(ChildGroup.truth, ChildGroup.relevance, ChildGroup.neutrality) && childType != NodeType.argument) {
		return `Where child-group is ${childGroup}, an argument child is expected.`;
	}
	return null;
}*/
export function IsWrapperArgNeededForTransfer(parent_type: NodeType, parent_childGroup: ChildGroup, transferNode_type: NodeType, transferNode_childGroup?: ChildGroup) {
	/*const transferNodeIsValidAlready = CheckValidityOfChildTypeInChildGroup(parent_type, parent_childGroup, transferNode_type) == null;
	const wrapperArgWouldBeValidInParent = CheckValidityOfChildTypeInChildGroup(parent_type, parent_childGroup, NodeType.argument) == null;*/
	const transferNodeIsValidAlready = CheckLinkIsValid(parent_type, parent_childGroup, transferNode_type) == null;
	const wrapperArgWouldBeValidInParent = CheckLinkIsValid(parent_type, parent_childGroup, NodeType.argument) == null;
	const transferNodeCanBePlacedInWrapperArg = transferNode_type == NodeType.claim && (transferNode_childGroup == null || transferNode_childGroup == ChildGroup.generic);
	return !transferNodeIsValidAlready && wrapperArgWouldBeValidInParent && transferNodeCanBePlacedInWrapperArg;
}

@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		mapID: {$ref: "UUID"},
		oldParentID: {$ref: "UUID"},
		$newParentID: {$ref: "UUID"},
		$nodeID: {$ref: "UUID"},
		newForm: {$ref: "ClaimForm"},
		newPolarity: {$ref: "Polarity"},
		//createWrapperArg: {type: "boolean"},
		$childGroup: {$ref: "ChildGroup"},
		unlinkFromOldParent: {type: "boolean"},
		deleteEmptyArgumentWrapper: {type: "boolean"},
	}),
	returnSchema: ()=>SimpleSchema({
		argumentWrapperID: {$ref: "UUID"},
		/*argumentWrapperID: {anyOf: [
			{$ref: "UUID"},
			{type: "null"},
		]},*/
	}),
	//defaultPayload: {createWrapperArg: true},
})
export class LinkNode_HighLevel extends Command<Payload, {argumentWrapperID?: string}> {
	map_data: Map|n;
	node_data: NodeL1;
	newParent_data: NodeL1;
	orderKeyForOuterNode: string;

	sub_addArgumentWrapper: AddChildNode;
	sub_linkToNewParent: LinkNode;
	sub_unlinkFromOldParent: UnlinkNode;
	sub_deleteOldParent: DeleteNode;
	Validate() {
		let {mapID, oldParentID, newParentID, nodeID, newForm, /*createWrapperArg,*/ childGroup, unlinkFromOldParent, deleteEmptyArgumentWrapper, newPolarity} = this.payload;
		AssertV(oldParentID !== nodeID, "Old parent-id and child-id cannot be the same!");
		AssertV(newParentID !== nodeID, "New parent-id and child-id cannot be the same!");
		//AssertV(oldParentID !== newParentID, "Old-parent-id and new-parent-id cannot be the same!");

		this.returnData = {};

		this.map_data = GetMap(mapID);
		this.node_data = GetNodeL2.NN(nodeID);
		const oldParent = GetNodeL2(oldParentID);
		if (oldParentID) AssertV(oldParent, "Old-parent-id was specified, yet no node exists with that ID!");
		// "this.X ?? X" checks needed for usage from TransferNodes.ts
		this.newParent_data = this.newParent_data ?? GetNodeL2.NN(newParentID);
		this.orderKeyForOuterNode = this.orderKeyForOuterNode ?? GetHighestLexoRankUnderParent(newParentID).genNext().toString();

		//let pastingPremiseAsRelevanceArg = IsPremiseOfMultiPremiseArgument(this.node_data, oldParent_data) && createWrapperArg;
		//const pastingPremiseAsRelevanceArg = this.node_data.type == NodeType.claim && createWrapperArg;
		const pastingPremiseAsRelevanceArg = this.node_data.type == NodeType.claim && childGroup == ChildGroup.relevance;
		AssertV(oldParentID !== newParentID || pastingPremiseAsRelevanceArg, "Old-parent-id and new-parent-id cannot be the same! (unless changing between truth-arg and relevance-arg)");
		//AssertV(CanContributeToNode(MeID(), newParentID), "Cannot paste under a node with contributions disabled.");

		// if (command.payload.unlinkFromOldParent && node.parents.VKeys().length == 1 && newParentPath.startsWith(draggedNodePath)) {
		/* if (unlinkFromOldParent && newParentPath.startsWith(draggedNodePath)) {
			return "Cannot move a node to a path underneath itself. (the move could orphan it and its descendants, if the new-parent's only anchoring was through the dragged-node)";
		} */
		if (unlinkFromOldParent) {
			const closestMapRootNode = this.newParent_data.rootNodeForMap ? newParentID : SearchUpFromNodeForNodeMatchingX(newParentID, IDIsOfNodeThatIsRootOfMap, null, [nodeID]);
			AssertV(closestMapRootNode != null, "Cannot move a node to a path that would orphan it.");
		}

		let newParentID_forClaim = newParentID;

		const wrapperArgNeeded = IsWrapperArgNeededForTransfer(this.newParent_data.type, childGroup, this.node_data.type);
		if (wrapperArgNeeded) {
			AssertV(childGroup == ChildGroup.relevance || childGroup == ChildGroup.truth,
				`Claim is being linked under parent that requires a wrapper-argument, but the specified child-group (${childGroup}) is incompatible with that.`);

			//const createWrapperArg = canCreateWrapperArg && createWrapperArg;
			// Assert(newPolarity, 'Since this command has to create a wrapper-argument, you must supply the newPolarity property.');
			newPolarity = newPolarity || Polarity.supporting; // if new-polarity isn't supplied, just default to Supporting (this can happen if a claim is copied from search-results)
			const argumentWrapper = new NodeL1({
				//EV({ownerMapID: OmitIfFalsy(this.newParent_data.ownerMapID)}),
				//accessPolicy: GetDefaultAccessPolicyID_ForNode(),
				accessPolicy: this.node_data.accessPolicy,
				type: NodeType.argument,
			});
			const argumentWrapperRevision = new NodeRevision();

			this.IntegrateSubcommand(()=>this.sub_addArgumentWrapper, null, ()=>new AddChildNode({
				mapID, parentID: newParentID, node: argumentWrapper, revision: argumentWrapperRevision,
				// link: E({ _: true }, newPolarity && { polarity: newPolarity }) as any,
				link: new NodeLink({group: childGroup, orderKey: this.orderKeyForOuterNode, polarity: newPolarity}),
			}));

			this.returnData.argumentWrapperID = this.sub_addArgumentWrapper.sub_addNode.payload.node.id;
			newParentID_forClaim = this.sub_addArgumentWrapper.sub_addNode.payload.node.id;
		}

		this.IntegrateSubcommand(()=>this.sub_linkToNewParent, null, ()=>new LinkNode({
			mapID,
			link: {
				parent: newParentID_forClaim, child: nodeID,
				group: wrapperArgNeeded ? ChildGroup.generic : childGroup,
				form: newForm,
				polarity: this.node_data.type == NodeType.argument ? newPolarity : null,
				orderKey: wrapperArgNeeded ? VLexoRank.middle().toString() : this.orderKeyForOuterNode,
			},
		}));

		if (unlinkFromOldParent && oldParent) {
			this.IntegrateSubcommand(()=>this.sub_unlinkFromOldParent, null,
				()=>new UnlinkNode({mapID, parentID: oldParentID!, childID: nodeID}),
				a=>a.allowOrphaning = true); // allow "orphaning" of nodeID, since we're going to reparent it simultaneously -- using the sub_linkToNewParent subcommand

			// if parent was argument, and node being moved is arg's only premise, and actor allows it (ie. their view has node as single-premise arg), also delete the argument parent
			const children = GetNodeLinks(oldParentID);
			if (oldParent.type == NodeType.argument && children.length == 1 && deleteEmptyArgumentWrapper) {
				this.IntegrateSubcommand(()=>this.sub_deleteOldParent, null,
					()=>new DeleteNode({mapID, nodeID: oldParentID!}),
					a=>a.childrenToIgnore = [nodeID]); // let DeleteNode sub that it doesn't need to wait for nodeID to be deleted (since we're moving it out from old-parent simultaneously with old-parent's deletion)
			}
		}
	}

	DeclareDBUpdates(db: DBHelper) {
		if (this.sub_unlinkFromOldParent) db.add(this.sub_unlinkFromOldParent.GetDBUpdates(db));
		if (this.sub_deleteOldParent) db.add(this.sub_deleteOldParent.GetDBUpdates(db));
		if (this.sub_addArgumentWrapper) db.add(this.sub_addArgumentWrapper.GetDBUpdates(db));
		db.add(this.sub_linkToNewParent.GetDBUpdates(db));
	}
}