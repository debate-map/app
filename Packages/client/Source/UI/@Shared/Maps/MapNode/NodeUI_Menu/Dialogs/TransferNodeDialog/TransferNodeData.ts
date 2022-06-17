import {MapNodeType, ChildGroup, ClaimForm, Polarity, MapNodeL3, GetParentNodeID, GetNodeChildrenL3, IsSinglePremiseArgument, ChildGroupLayout} from "dm_common";
import {Command} from "web-vcore/.yalc/mobx-graphlink";

export class TransferNodesPayload {
	nodes: NodeInfoForTransfer[];
}
export class NodeInfoForTransfer {
	nodeID: string;
	oldParentID: string;
	transferType: TransferType;
	clone_newType: MapNodeType;
	clone_keepChildren: boolean;

	newParentID?: string|n;
	childGroup: ChildGroup;
	claimForm?: ClaimForm|n;
	argumentPolarity?: Polarity|n;
}
export const TransferType_values = [
	"ignore",
	"move", "link", "clone",
	"shim",
	//"delete", // for the case of moving a claim to a place not needing an argument wrapper, where the old argument-wrapper would otherwise be left empty
] as const;
export type TransferType = typeof TransferType_values[number];

export type PayloadOf<T> = T extends Command<infer Payload> ? Payload : never;

export class TransferNodesUIState {
	destinationParent: MapNodeL3;
	destinationChildGroup: ChildGroup;
}

export function GetTransferNodesInitialData(transferNode: MapNodeL3, transferNodePath: string, newParent: MapNodeL3, outerChildGroup: ChildGroup, transferType: TransferType) {
	const oldParentID = GetParentNodeID(transferNodePath);
	if (oldParentID == null || transferNode.link == null) return [null, null] as const; // parentless not supported yet

	const commandData_initial: TransferNodesPayload = {
		nodes: [
			{
				nodeID: transferNode.id,
				oldParentID,
				transferType,
				clone_newType: transferNode.type,
				clone_keepChildren: true,

				newParentID: newParent.id,
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
			commandData_initial.nodes.push({
				nodeID: premise.id,
				oldParentID: transferNode.id,
				transferType,
				clone_newType: premise.type,
				clone_keepChildren: true,

				newParentID: null,
				childGroup: ChildGroup.generic,
				claimForm: premise.link!.form,
				argumentPolarity: premise.link!.polarity,
			});
		}
	}

	const uiState_initial: TransferNodesUIState = {destinationParent: newParent, destinationChildGroup: outerChildGroup};

	return [commandData_initial, uiState_initial] as const;
}