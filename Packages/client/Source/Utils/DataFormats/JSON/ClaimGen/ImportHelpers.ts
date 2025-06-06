import {IR_NodeAndRevision, ImportResource} from "Utils/DataFormats/DataExchangeFormat.js";
import {CreateAccessor, GenerateUUID} from "mobx-graphlink";
import {ArgumentType, Attachment, ChildGroup, ClaimForm, CullNodePhrasingToBeEmbedded, GetSystemAccessPolicyID, NodeL1, NodeLink, NodePhrasing, NodePhrasingType, NodeRevision, NodeType, OrderKey, Polarity, systemUserID} from "dm_common";
import {CG_Node} from "./DataModel.js";

export class ImportContext {
	mapID: string;
	nodeAccessPolicyID: string;
}

export const GetResourcesInImportSubtree_CG = CreateAccessor((context: ImportContext, rootNode: CG_Node)=>{
	return GetResourcesInImportNode_CG(context, rootNode, [0], [CG_Node.GetText(rootNode)], null, null);
});
export const GetResourcesInImportNode_CG = CreateAccessor((context: ImportContext, node: CG_Node, path_indexes: number[], path_titles: string[], parentResource: ImportResource|n, parentNode: CG_Node|n)=>{
	const result = [] as ImportResource[];

	// own node
	const ownResource = NewNodeResource(context, node, path_indexes, path_titles, parentResource, parentNode);
	result.push(ownResource);

	// children nodes
	for (const [i, child] of CG_Node.GetChildren(node).entries()) {
		result.push(...GetResourcesInImportNode_CG(context, child, path_indexes.concat(i), path_titles.concat(CG_Node.GetText(child)), ownResource, node));
	}

	return result;
});

export const NewNodeResource = CreateAccessor((context: ImportContext, data: CG_Node, path_indexes: number[], path_titles: string[], parentResource: ImportResource|n, parentData: CG_Node|n)=>{
	const nodeType = CG_Node.GetNodeType(data);
	const node = new NodeL1({
		type: nodeType,
		accessPolicy: context.nodeAccessPolicyID,
	});

	let orderKey = OrderKey.mid();
	const ownIndexUnderParent = path_indexes.Last();
	for (let i = 0; i < ownIndexUnderParent; i++) {
		orderKey = orderKey.next();
	}
	const link = new NodeLink({
		group: parentData && CG_Node.GetNodeType(parentData) == NodeType.claim ? ChildGroup.freeform : ChildGroup.generic,
		orderKey: orderKey.toString(),
		//form: claimForm,
	});
	if (nodeType == NodeType.argument) {
		link.polarity = Polarity.supporting;
	}

	const mainTitle = CG_Node.GetText(data);
	const revision = new NodeRevision({
		displayDetails: undefined,
		attachments: CG_Node.GetAttachments(data),
		node: node.id,
		phrasing: {
			text_base: mainTitle,
			terms: [],
		},
	});
	return new IR_NodeAndRevision({
		pathInData: path_indexes,
		link, node, revision,
		insertPath_titles: path_titles.slice(0, -1), // insert-path should exclude this new node itself
		insertPath_parentResourceLocalID: parentResource?.localID,
		ownTitle: path_titles.Last(),
	});
});