import {NodeType, ChildGroup, ClaimForm, Polarity, NodeL3, GetParentNodeID, GetNodeChildrenL3, TransferNodesPayload, TransferType, Map, GetSystemAccessPolicyID, NodeTagCloneType} from "dm_common";
import {Command} from "web-vcore/nm/mobx-graphlink.js";
import {TransferNodeNeedsWrapper} from "../TransferNodeDialog.js";

export type PayloadOf<T> = T extends Command<infer Payload> ? Payload : never;

export class TransferNodesUIState {
	destinationParent: NodeL3;
	destinationChildGroup: ChildGroup;
}

export function GetTransferNodesInitialData(map: Map|n, transferNode: NodeL3, transferNodePath: string, newParent: NodeL3, outerChildGroup: ChildGroup|n, transferType: TransferType) {
	const oldParentID = GetParentNodeID(transferNodePath);
	if (oldParentID == null || transferNode.link == null) return [null, null] as const; // parentless not supported yet

	const outerChildGroupOrDefault = outerChildGroup ?? ChildGroup.generic;

	const payload_initial: TransferNodesPayload = {
		nodes: [
			{
				nodeID: transferNode.id,
				oldParentID,
				transferType,
				clone_newType: transferNode.type,
				clone_keepChildren: false,
				clone_keepTags: NodeTagCloneType.basics,

				newParentID: newParent.id,
				newAccessPolicyID: map?.nodeAccessPolicy,
				childGroup: outerChildGroupOrDefault,
				claimForm: transferNode.link.form,
				argumentPolarity: transferNode.link.polarity,
			},
		],
	};

	const sourcePath = `${oldParentID}/${transferNode.id}`;
	const sourceNode = transferNode;
	const sourceNodeChildren = sourceNode && GetNodeChildrenL3(sourceNode.id, sourcePath);
	// should this be added back, by just treating an argument with 1-claim as being a "single premise argument"?
	/*if (IsSinglePremiseArgument(transferNode) && sourceNodeChildren && sourceNodeChildren.length > 0) {
		const premise = sourceNodeChildren.find(a=>a.type == NodeType.claim);
		if (premise) {
			payload_initial.nodes.push({
				nodeID: premise.id,
				oldParentID: transferNode.id,
				transferType,
				clone_newType: premise.type,
				clone_keepChildren: false,
				clone_keepTags: NodeTagCloneType.basics,

				newParentID: null,
				newAccessPolicyID: map?.nodeAccessPolicy,
				childGroup: ChildGroup.generic,
				claimForm: premise.link!.form,
				argumentPolarity: premise.link!.polarity,
			});
		}
	}*/

	const uiState_initial: TransferNodesUIState = {destinationParent: newParent, destinationChildGroup: outerChildGroupOrDefault};

	// if only 1 transfer atm, and it's a claim, and destination doesn't accept a bare claim as a structured child, then add extra transfer of type "shim" (for if user wants node ending up in a structured child-group)
	if (payload_initial.nodes.length == 1 && transferNode.type == NodeType.claim) {
		const claimNeedsWrapper = TransferNodeNeedsWrapper(payload_initial.nodes[0], uiState_initial);
		if (claimNeedsWrapper) {
			payload_initial.nodes.Insert(0, {
				transferType: TransferType.shim,
				childGroup: uiState_initial.destinationChildGroup,
				// not relevant, but required fields
				clone_newType: NodeType.argument,
				clone_keepChildren: false,
				clone_keepTags: NodeTagCloneType.basics,
			});
		}
	}

	return [payload_initial, uiState_initial] as const;
}