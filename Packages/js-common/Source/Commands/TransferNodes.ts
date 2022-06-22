import {Assert, Clone, GetValues} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, AssertV, Command, CommandMeta, DBHelper, Field, GetSchemaJSON, MGLClass, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {AsNodeL1, ChildGroup, GetHighestLexoRankUnderParent, GetNodeL2, GetNodeL3, MapNodeRevision, MapNodeType, NodeChildLink} from "../DB.js";
import {GetAccessPolicy, GetSystemAccessPolicyID} from "../DB/accessPolicies.js";
import {GetNodeChildLinks} from "../DB/nodeChildLinks.js";
import {ClaimForm, MapNode, MapNodeL3, Polarity} from "../DB/nodes/@MapNode.js";
import {AddChildNode} from "./AddChildNode.js";
import {LinkNode} from "./LinkNode.js";

@MGLClass({schemaDeps: [
	/*"UUID",*/ // commented for now, since the schema-dependency system seems to get stuck with it, fsr (perhaps failure for multiple deps)
	"NodeInfoForTransfer",
]})
export class TransferNodesPayload {
	//@Field({$ref: "UUID"}, {opt: true})
	@Field({type: "string"}, {opt: true})
	mapID?: string|n;

	@Field({items: {$ref: "NodeInfoForTransfer"}})
	nodes: NodeInfoForTransfer[];
}
@MGLClass()
export class NodeInfoForTransfer {
	@Field({type: ["string", "null"]}, {opt: true})
	nodeID?: string; // can be null, if transfer is of type "shim"

	@Field({type: ["string", "null"]}, {opt: true})
	oldParentID?: string;

	@Field({$ref: "TransferType"})
	transferType: TransferType;

	@Field({$ref: "MapNodeType"})
	clone_newType: MapNodeType;

	@Field({type: "boolean"})
	clone_keepChildren: boolean;

	@Field({type: ["string", "null"]}, {opt: true})
	newParentID?: string|n;

	@Field({type: ["string", "null"]}, {opt: true})
	newAccessPolicyID?: string|n;

	@Field({$ref: "ChildGroup"}, {opt: true})
	childGroup: ChildGroup;

	@Field({$ref: "ClaimForm"}, {opt: true})
	claimForm?: ClaimForm|n;

	@Field({$ref: "Polarity"}, {opt: true})
	argumentPolarity?: Polarity|n;
}

/*export const TransferType_values = [
	"ignore",
	"move", "link", "clone",
	"shim",
	//"delete", // for the case of moving a claim to a place not needing an argument wrapper, where the old argument-wrapper would otherwise be left empty
] as const;
export type TransferType = typeof TransferType_values[number];
AddSchema("TransferType", {enum: GetValues(MapNodeType)});*/
export enum TransferType {
	ignore = "ignore",
	move = "move",
	link = "link",
	clone = "clone",
	shim = "shim",
}
AddSchema("TransferType", {enum: GetValues(TransferType)});

class TransferData {
	addNodeCommand?: AddChildNode;
	linkChildCommands = [] as LinkNode[];
}

@MapEdit
@UserEdit
/*@CommandRunMeta({
	record: true,
	record_cancelIfAncestorCanBeInStream: true,
	canShowInStream: true,
	rlsTargetPaths: [
		{table: "nodes", fieldPath: ["payload", "revision", "node"]},
	],
})*/
@CommandMeta({
	payloadSchema: ()=>GetSchemaJSON("TransferNodesPayload"),
	returnSchema: ()=>SimpleSchema({
		//$id: {type: "string"},
	}),
})
export class TransferNodes extends Command<TransferNodesPayload, {/*id: string*/}> {
	transferData = [] as TransferData[];
	Validate() {
		const {nodes} = this.payload;
		console.log("Validate called. @payload:", this.payload);

		for (const [i, transfer] of nodes.entries()) {
			const prevTransfer = nodes[i - 1];
			const prevTransferData = this.transferData[i - 1];

			const accessPolicyID = transfer.newAccessPolicyID != null ? GetAccessPolicy.NN(transfer.newAccessPolicyID)!.id : GetSystemAccessPolicyID("Public, ungoverned (standard)");

			if (transfer.transferType == TransferType.ignore) {
				// no processing needed
			} else if (transfer.transferType == TransferType.move) {
				// todo
			} else if (transfer.transferType == TransferType.link) {
				// todo
			} else if (transfer.transferType == TransferType.clone) {
				AssertV(transfer.oldParentID != null, "Only nodes with a parent can be cloned at the moment.");
				const node = GetNodeL3.NN(`${transfer.oldParentID}/${transfer.nodeID}`);

				if (transfer.newParentID != null) {
					AssertV(GetNodeL2(transfer.newParentID) != null, "New-parent-id specifies a node that doesn't exist!");
				}
				const newParentID = transfer.newParentID ?? prevTransferData.addNodeCommand?.returnData.nodeID;
				AssertV(newParentID != null, "Parent-node-id is still null!");
				const orderKeyForNewNode = GetHighestLexoRankUnderParent(newParentID).genNext().toString();

				const newNode = Clone(AsNodeL1(node)) as MapNode;
				if (transfer.clone_newType != null && transfer.clone_newType != node.type) {
					newNode.type = transfer.clone_newType;
				}
				newNode.accessPolicy = accessPolicyID;
				const newRev = Clone(node.current) as MapNodeRevision;

				// todo: have cloned-node "marked as a clone" somehow, with the UI able to make good use of this information

				const newLink = Clone(node.link) as NodeChildLink;
				newLink.group = transfer.childGroup;
				newLink.orderKey = orderKeyForNewNode;
				if (newNode.type == MapNodeType.argument && transfer.argumentPolarity != null) {
					newLink.polarity = transfer.argumentPolarity;
				}

				this.IntegrateSubcommand<AddChildNode>(
					()=>(this.transferData[i]?.addNodeCommand as any),
					cmd=>{
						const transferData = this.transferData[i] ?? (this.transferData[i] = new TransferData());
						transferData.addNodeCommand = cmd;
					},
					()=>{
						const addNodeCommand = new AddChildNode({
							parentID: newParentID,
							node: newNode,
							revision: newRev,
							link: newLink,
						});
						return addNodeCommand;
					},
					cmd=>cmd.sub_addLink,
				);
				const transferData = this.transferData[i]; // by this point, it'll be set

				if (transfer.clone_keepChildren) {
					const oldChildLinks = GetNodeChildLinks(node.id);
					for (const [i2, link] of oldChildLinks.entries()) {
						this.IntegrateSubcommand(
							()=>transferData.linkChildCommands[i2],
							cmd=>transferData.linkChildCommands[i2] = cmd,
							()=>{
								const linkCommand = new LinkNode({
									link: {...link, parent: transferData.addNodeCommand!.returnData.nodeID},
								});
								return linkCommand;
							},
						);
					}
				}
			} else if (transfer.transferType == TransferType.shim) {
				const argumentWrapper = new MapNode({
					accessPolicy: accessPolicyID,
					type: MapNodeType.argument,
				});
				const argumentWrapperRevision = new MapNodeRevision();

				AssertV(transfer.newParentID != null, `For transfer of type "shim", the new-parent-id must be specified.`);
				const newParent = GetNodeL2.NN(transfer.newParentID);
				const orderKeyForNewNode = GetHighestLexoRankUnderParent(newParent.id).genNext().toString();

				this.IntegrateSubcommand(
					()=>(this.transferData[i]?.addNodeCommand as any),
					cmd=>{
						const transferData = this.transferData[i] ?? (this.transferData[i] = new TransferData());
						transferData.addNodeCommand = cmd;
					},
					()=>{
						const cmd = new AddChildNode({
							parentID: transfer.newParentID!,
							node: argumentWrapper,
							revision: argumentWrapperRevision,
							// link: E({ _: true }, newPolarity && { polarity: newPolarity }) as any,
							link: new NodeChildLink({
								group: transfer.childGroup,
								orderKey: orderKeyForNewNode,
								polarity: transfer.argumentPolarity ?? Polarity.supporting,
							}),
						});
						return cmd;
					},
				);
			}
		}

		this.returnData = {};
	}

	DeclareDBUpdates(db: DBHelper) {
		for (const transferData of this.transferData) {
			transferData.addNodeCommand?.DeclareDBUpdates(db);
			for (const linkCommand of transferData.linkChildCommands) {
				linkCommand.DeclareDBUpdates(db);
			}
		}
	}
}