import {Assert, Clone, GetValues} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, AssertV, Command, CommandMeta, DBHelper, Field, GetSchemaJSON, MGLClass, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {MaybeCloneAndRetargetNodeTag, MapNodeTag, TagComp_CloneHistory} from "../DB/nodeTags/@MapNodeTag.js";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {AsNodeL1, ChildGroup, GetHighestLexoRankUnderParent, GetNodeL2, GetNodeL3, MapNodeRevision, MapNodeType, NodeChildLink} from "../DB.js";
import {GetAccessPolicy, GetSystemAccessPolicyID} from "../DB/accessPolicies.js";
import {GetNodeChildLinks} from "../DB/nodeChildLinks.js";
import {ClaimForm, MapNode, MapNodeL3, Polarity} from "../DB/nodes/@MapNode.js";
import {GetNodeTagComps, GetNodeTags} from "../DB/nodeTags.js";
import {AddChildNode} from "./AddChildNode.js";
import {AddNodeTag} from "./AddNodeTag.js";
import {LinkNode} from "./LinkNode.js";
import {CheckValidityOfLink, CheckValidityOfNewLink, GetNode} from "../DB/nodes.js";
import {MapNodeType_Info} from "../DB/nodes/@MapNodeType.js";
import {LinkNode_HighLevel} from "./LinkNode_HighLevel.js";

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

	@Field({$ref: "NodeTagCloneType"})
	clone_keepTags: NodeTagCloneType;

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

export enum NodeTagCloneType {
	minimal = "minimal",
	basics = "basics",
	//full = "full",
}
AddSchema("NodeTagCloneType", {enum: GetValues(NodeTagCloneType)});

class TransferData {
	addNodeCommand?: AddChildNode;
	linkChildCommands = [] as (LinkNode | LinkNode_HighLevel)[];
	addTagCommands = [] as AddNodeTag[];
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
				/*const newParent = transfer.newParentID ? GetNode(transfer.newParentID) : prevTransferData.addNodeCommand?.sub_addNode.payload.node;
				AssertV(newParent != null, "Parent-node is still null!");*/

				const newNode = Clone(AsNodeL1(node)) as MapNode;
				if (transfer.clone_newType != null && transfer.clone_newType != node.type) {
					newNode.type = transfer.clone_newType;
				}
				newNode.accessPolicy = accessPolicyID;
				const newRev = Clone(node.current) as MapNodeRevision;

				const newLink = Clone(node.link) as NodeChildLink;
				newLink.group = transfer.childGroup;
				newLink.orderKey = orderKeyForNewNode;
				if (newNode.type == MapNodeType.argument) {
					newLink.polarity = transfer.argumentPolarity ?? Polarity.supporting;
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
				const newNodeID = transferData.addNodeCommand!.returnData.nodeID;

				if (transfer.clone_keepChildren) {
					const oldChildLinks = GetNodeChildLinks(node.id);
					for (const [i2, link] of oldChildLinks.entries()) {
						this.IntegrateSubcommand(
							()=>transferData.linkChildCommands[i2],
							cmd=>transferData.linkChildCommands[i2] = cmd,
							()=>{
								const newLink = {...link};
								newLink.parent = transferData.addNodeCommand!.returnData.nodeID;

								// if we're changing the node's type, check for child-links it has that are invalid (eg. wrong child-group), and try to change them to be valid
								if (newNode.type != node.type && CheckValidityOfLink(newNode.type, newLink.group, newLink.c_childType!) != null) {
									const firstValidGroupForChildType = [...MapNodeType_Info.for[newNode.type].childGroup_childTypes.entries()].filter(a=>a[1].includes(newLink.c_childType!));
									Assert(firstValidGroupForChildType != null, `Cannot clone node while both changing type and keeping children, because there are children whose type (${newLink.c_childType}) cannot be placed into any of the new node's child-groups.`);
									newLink.group = firstValidGroupForChildType[0][0];
								}

								// hard-coded exception here: if old-node-type is category (with claim children), and new-node-type is claim, then have children claims be wrapped into argument nodes
								if (node.type == MapNodeType.category && newNode.type == MapNodeType.claim && newLink.c_childType == MapNodeType.claim) {
									const linkCommand = new LinkNode_HighLevel({
										/*mapID: null,
										oldParentID: null,*/
										newParentID: newNodeID,
										childGroup: ChildGroup.truth,
										nodeID: newLink.child,
										newForm: newLink.form,
										newPolarity: newLink.polarity,
										deleteEmptyArgumentWrapper: false,
										unlinkFromOldParent: false,
									});
									linkCommand.newParent_data = newNode;
									linkCommand.orderKeyForOuterNode = newLink.orderKey;
									return linkCommand;
								}

								const linkCommand = new LinkNode({
									link: newLink,
								});
								return linkCommand;
							},
						);
					}
				}

				const tags = GetNodeTags(node.id);
				for (const [i2, tag] of tags.entries()) {
					const newTag = MaybeCloneAndRetargetNodeTag(tag, transfer.clone_keepTags, node.id, newNodeID);
					if (newTag != null) {
						this.IntegrateSubcommand(
							()=>transferData.addTagCommands[i2],
							cmd=>transferData.addTagCommands[i2] = cmd,
							()=>{
								return new AddNodeTag({tag: newTag});
							},
						);
					}
				}

				const tagsShowingCloneHistoryForOldNode = tags.filter(tag=>tag.cloneHistory != null && tag.cloneHistory.cloneChain.LastOrX() == node.id);
				// if there was no clone-history tag we could extend to record this clone action, create a brand new clone-history tag for it
				if (tagsShowingCloneHistoryForOldNode.length == 0) {
					const i2 = tags.length;
					this.IntegrateSubcommand(
						()=>transferData.addTagCommands[i2],
						cmd=>transferData.addTagCommands[i2] = cmd,
						()=>{
							const newNodes = [node.id, transferData.addNodeCommand!.returnData.nodeID];
							const newCloneHistory = new TagComp_CloneHistory();
							newCloneHistory.cloneChain = [node.id, transferData.addNodeCommand!.returnData.nodeID];
							const addTagCommand = new AddNodeTag({
								tag: {
									nodes: newNodes,
									cloneHistory: newCloneHistory,
								} as MapNodeTag,
							});
							return addTagCommand;
						},
					);
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
			for (const addTagCommand of transferData.addTagCommands) {
				// check if slot has an add-tag command (there can be gaps, if the node being cloned has tags, but some of them do not need transfering [the slots/indices of the orig-tags are used for `addTagsCommands` array])
				if (addTagCommand != null) {
					addTagCommand.DeclareDBUpdates(db);
				}
			}
		}
	}
}