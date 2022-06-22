import {MapNodeType, ChildGroup, ClaimForm, Polarity, MapNodeL3, GetParentNodeID, GetNodeChildrenL3, IsSinglePremiseArgument, ChildGroupLayout, TransferNodesPayload, TransferType, Map, GetSystemAccessPolicyID} from "dm_common";
import {Command} from "web-vcore/.yalc/mobx-graphlink";
import {TransferNodeNeedsWrapper} from "../TransferNodeDialog.js";

export type PayloadOf<T> = T extends Command<infer Payload> ? Payload : never;

export class TransferNodesUIState {
	destinationParent: MapNodeL3;
	destinationChildGroup: ChildGroup;
}

export function GetTransferNodesInitialData(map: Map|n, transferNode: MapNodeL3, transferNodePath: string, newParent: MapNodeL3, outerChildGroup: ChildGroup, transferType: TransferType) {
	const oldParentID = GetParentNodeID(transferNodePath);
	if (oldParentID == null || transferNode.link == null) return [null, null] as const; // parentless not supported yet

	const payload_initial: TransferNodesPayload = {
		nodes: [
			{
				nodeID: transferNode.id,
				oldParentID,
				transferType,
				clone_newType: transferNode.type,
				clone_keepChildren: false,

				newParentID: newParent.id,
				newAccessPolicyID: map?.nodeAccessPolicy,
				childGroup: outerChildGroup,
				claimForm: transferNode.link.form,
				argumentPolarity: transferNode.link.polarity,
			},
		],
	};

	const sourcePath = `${oldParentID}/${transferNode.id}`;
	const sourceNode = transferNode;
	const sourceNodeChildren = sourceNode && GetNodeChildrenL3(sourceNode.id, sourcePath);
	if (IsSinglePremiseArgument(transferNode) && sourceNodeChildren && sourceNodeChildren.length > 0) {
		const premise = sourceNodeChildren.find(a=>a.type == MapNodeType.claim);
		if (premise) {
			payload_initial.nodes.push({
				nodeID: premise.id,
				oldParentID: transferNode.id,
				transferType,
				clone_newType: premise.type,
				clone_keepChildren: false,

				newParentID: null,
				newAccessPolicyID: map?.nodeAccessPolicy,
				childGroup: ChildGroup.generic,
				claimForm: premise.link!.form,
				argumentPolarity: premise.link!.polarity,
			});
		}
	}

	const uiState_initial: TransferNodesUIState = {destinationParent: newParent, destinationChildGroup: outerChildGroup};

	// if only 1 transfer atm, and it's a claim, and destination doesn't accept a bare claim as a structured child, then add extra transfer of type "shim" (for if user wants node ending up in a structured child-group)
	if (payload_initial.nodes.length == 1 && transferNode.type == MapNodeType.claim) {
		const claimNeedsWrapper = TransferNodeNeedsWrapper(payload_initial.nodes[0], uiState_initial);
		if (claimNeedsWrapper) {
			payload_initial.nodes.Insert(0, {
				transferType: TransferType.shim,
				childGroup: uiState_initial.destinationChildGroup,
				// not relevant, but required fields
				clone_newType: MapNodeType.argument,
				clone_keepChildren: false,
			});
		}
	}

	return [payload_initial, uiState_initial] as const;
}