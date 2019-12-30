import {GetNode, GetHolderType, ForNewLink_GetError, GetParentNodeL3, GetParentNodeID} from "Store/firebase/nodes";
import {Assert, E, OmitIfFalsy} from "js-vextensions";
import {GetNodeL2, GetNodeL3} from "Store/firebase/nodes/$node";
import {MapNodeRevision} from "Store/firebase/nodes/@MapNodeRevision";
import {GetUserPermissionGroups, MeID, CanContributeToNode} from "Store/firebase/users";

import {Map} from "Store/firebase/maps/@Map";
import {UUID} from "Utils/General/KeyGenerator";
import {Command_Old, MergeDBUpdates, GetAsync, Command, AssertV} from "mobx-firelink";
import {GetMap} from "Store/firebase/maps";
import {SearchUpFromNodeForNodeMatchingX} from "Utils/Store/PathFinder";
import {ClaimForm, MapNode, Polarity, MapNodeL3} from "../../Store/firebase/nodes/@MapNode";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {UserEdit} from "./../CommandMacros";
import {LinkNode} from "./LinkNode";
import {UnlinkNode} from "./UnlinkNode";
import {AddNode} from "./AddNode";
import {AddChildNode} from "./AddChildNode";
import {DeleteNode} from "./DeleteNode";

type Payload = {
	mapID: string, oldParentID: string, newParentID: string, nodeID: string,
	newForm?: ClaimForm, newPolarity?: Polarity, allowCreateWrapperArg?: boolean,
	unlinkFromOldParent?: boolean, deleteOrphanedArgumentWrapper?: boolean };

export function CreateLinkCommand(mapID: UUID, draggedNodePath: string, dropOnNodePath: string, polarity: Polarity, asCopy: boolean) {
	const draggedNode = GetNodeL3(draggedNodePath);
	const dropOnNode = GetNodeL3(dropOnNodePath);

	// const draggedNode_parent = GetParentNodeL3(draggedNodePath);
	const dropOnNode_parent = GetParentNodeL3(dropOnNodePath);
	const holderType = GetHolderType(dropOnNode.type, dropOnNode_parent ? dropOnNode_parent.type : null);
	const formForClaimChildren = dropOnNode.type == MapNodeType.Category ? ClaimForm.YesNoQuestion : ClaimForm.Base;

	return new LinkNode_HighLevel({
		mapID, oldParentID: GetParentNodeID(draggedNodePath), newParentID: dropOnNode._key, nodeID: draggedNode._key,
		newForm: draggedNode.type == MapNodeType.Claim ? formForClaimChildren : null,
		newPolarity: polarity,
		allowCreateWrapperArg: holderType != null || !dropOnNode.multiPremiseArgument,
		unlinkFromOldParent: !asCopy, deleteOrphanedArgumentWrapper: true,
	});
}

export class LinkNode_HighLevel extends Command<Payload, {argumentWrapperID?: string}> {
	static defaultPayload = {allowCreateWrapperArg: true};

	map_data: Map;
	node_data: MapNode;
	newParent_data: MapNode;

	sub_addArgumentWrapper: AddChildNode;
	sub_linkToNewParent: LinkNode;
	sub_unlinkFromOldParent: UnlinkNode;
	sub_deleteOldParent: DeleteNode;
	Validate() {
		let {mapID, oldParentID, newParentID, nodeID, newForm, allowCreateWrapperArg, unlinkFromOldParent, deleteOrphanedArgumentWrapper, newPolarity} = this.payload;
		AssertV(oldParentID !== nodeID, "Old parent-id and child-id cannot be the same!");
		AssertV(newParentID !== nodeID, "New parent-id and child-id cannot be the same!");
		AssertV(oldParentID !== newParentID, "Old-parent-id and new-parent-id cannot be the same!");

		this.returnData = {};

		this.map_data = GetMap(mapID);
		AssertV(this.map_data, "map_data is null.");
		this.node_data = GetNodeL2(nodeID);
		AssertV(this.node_data, "node_data is null.");
		const oldParent_data = GetNodeL2(oldParentID);
		AssertV(oldParent_data, "oldParent_data is null.");
		this.newParent_data = GetNodeL2(newParentID);
		AssertV(this.newParent_data, "newParent_data is null.");

		AssertV(CanContributeToNode(MeID(), newParentID), "Cannot paste under a node with contributions disabled.");

		// if (command.payload.unlinkFromOldParent && node.parents.VKeys(true).length == 1 && newParentPath.startsWith(draggedNodePath)) {
		/* if (unlinkFromOldParent && newParentPath.startsWith(draggedNodePath)) {
			return "Cannot move a node to a path underneath itself. (the move could orphan it and its descendants, if the new-parent's only anchoring was through the dragged-node)";
		} */
		if (unlinkFromOldParent) {
			const closestMapRootNode = this.newParent_data.rootNodeForMap ? newParentID : SearchUpFromNodeForNodeMatchingX(newParentID, id=>GetNode(id)?.rootNodeForMap != null, [nodeID]);
			AssertV(closestMapRootNode != null, "Cannot move a node to a path that would orphan it.");
		}

		let newParentID_forClaim = newParentID;

		const canCreateWrapperArg = this.node_data.type === MapNodeType.Claim && this.newParent_data.type.IsOneOf(MapNodeType.Claim, MapNodeType.Argument);
		if (canCreateWrapperArg) {
			const createWrapperArg = canCreateWrapperArg && allowCreateWrapperArg;
			if (createWrapperArg) {
				// Assert(newPolarity, 'Since this command has to create a wrapper-argument, you must supply the newPolarity property.');
				newPolarity = newPolarity || Polarity.Supporting; // if new-polarity isn't supplied, just default to Supporting (this can happen if a claim is copied from search-results)
				const argumentWrapper = new MapNode({type: MapNodeType.Argument, ownerMapID: OmitIfFalsy(this.newParent_data.ownerMapID)});
				const argumentWrapperRevision = new MapNodeRevision(this.map_data.nodeDefaults);

				this.sub_addArgumentWrapper = this.sub_addArgumentWrapper ?? new AddChildNode({
					mapID, parentID: newParentID, node: argumentWrapper, revision: argumentWrapperRevision,
					// link: E({ _: true }, newPolarity && { polarity: newPolarity }) as any,
					link: E({_: true, polarity: newPolarity}) as any,
				}).MarkAsSubcommand(this);
				this.sub_addArgumentWrapper.Validate();

				this.returnData.argumentWrapperID = this.sub_addArgumentWrapper.sub_addNode.nodeID;
				newParentID_forClaim = this.sub_addArgumentWrapper.sub_addNode.nodeID;
			} else {
				const mustCreateWrapperArg = canCreateWrapperArg && !this.newParent_data.multiPremiseArgument;
				AssertV(mustCreateWrapperArg === false, `Linking node #${nodeID} under #${newParentID} requires creating a wrapper-arg, but this was disallowed by passed prop.`);
			}
		}

		this.sub_linkToNewParent = this.sub_linkToNewParent ?? new LinkNode({mapID, parentID: newParentID_forClaim, childID: nodeID, childForm: newForm, childPolarity: newPolarity}).MarkAsSubcommand(this);
		this.sub_linkToNewParent.Validate();

		if (unlinkFromOldParent) {
			this.sub_unlinkFromOldParent = this.sub_unlinkFromOldParent ?? new UnlinkNode({mapID, parentID: oldParentID, childID: nodeID}).MarkAsSubcommand(this);
			this.sub_unlinkFromOldParent.allowOrphaning = true; // allow "orphaning" of nodeID, since we're going to reparent it simultaneously -- using the sub_linkToNewParent subcommand
			this.sub_unlinkFromOldParent.Validate();

			// if the old parent was an argument, and the moved node was its only child, also delete the old parent
			if (deleteOrphanedArgumentWrapper && oldParent_data.type === MapNodeType.Argument && oldParent_data.children.VKeys(true).length === 1) {
				this.sub_deleteOldParent = this.sub_deleteOldParent ?? new DeleteNode({mapID, nodeID: oldParentID}).MarkAsSubcommand(this);
				this.sub_deleteOldParent.childrenToIgnore = [nodeID]; // let DeleteNode sub that it doesn't need to wait for nodeID to be deleted (since we're moving it out from old-parent simultaneously with old-parent's deletion)
				this.sub_deleteOldParent.Validate();
			}
		}
	}

	GetDBUpdates() {
		let updates = {};
		if (this.sub_unlinkFromOldParent) updates = MergeDBUpdates(updates, this.sub_unlinkFromOldParent.GetDBUpdates());
		if (this.sub_deleteOldParent) updates = MergeDBUpdates(updates, this.sub_deleteOldParent.GetDBUpdates());
		if (this.sub_addArgumentWrapper) updates = MergeDBUpdates(updates, this.sub_addArgumentWrapper.GetDBUpdates());
		updates = MergeDBUpdates(updates, this.sub_linkToNewParent.GetDBUpdates());
		return updates;
	}
}