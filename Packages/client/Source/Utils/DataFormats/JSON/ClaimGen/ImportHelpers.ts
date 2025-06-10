import {IR_NodeAndRevision, ImportResource} from "Utils/DataFormats/DataExchangeFormat.js";
import {CreateAccessor, GenerateUUID} from "mobx-graphlink";
import {ArgumentType, Attachment, ChildGroup, ClaimForm, CullNodePhrasingToBeEmbedded, GetSystemAccessPolicyID, NodeL1, NodeL3, NodeLink, NodePhrasing, NodePhrasingType, NodeRevision, NodeType, NodeType_Info, OrderKey, Polarity, systemUserID} from "dm_common";
import {CG_Node} from "./DataModel.js";

export class ImportContext {
	mapID: string;
	nodeAccessPolicyID: string;
	importUnderNode: NodeL3;
}

export const GetResourcesInImportSubtree_CG = CreateAccessor((context: ImportContext, rootLayer: CG_Node)=>{
	const rootNodes = rootLayer.text != null ? [rootLayer] : CG_Node.GetChildren(rootLayer);
	const allResources = [] as ImportResource[];
	for (const [i, rootNode] of rootNodes.entries()) {
		allResources.push(...GetResourcesInImportNode_CG(context, rootNode, [i], [CG_Node.GetText(rootNode)], null, null));
	}
	return allResources;
});
export const GetResourcesInImportNode_CG = CreateAccessor((context: ImportContext, nodeData: CG_Node, path_indexes: number[], path_titles: string[], parentResource: ImportResource|n, parentNodeData: CG_Node|n)=>{
	const result = [] as ImportResource[];

	// own node
	const ownResource = NewNodeResource(context, nodeData, path_indexes, path_titles, parentResource, parentNodeData);
	result.push(ownResource);

	// children nodes
	for (const [i, child] of CG_Node.GetChildren(nodeData).entries()) {
		result.push(...GetResourcesInImportNode_CG(context, child, path_indexes.concat(i), path_titles.concat(CG_Node.GetText(child)), ownResource, nodeData));
	}

	return result;
});

export const NewNodeResource = CreateAccessor((context: ImportContext, nodeData: CG_Node, path_indexes: number[], path_titles: string[], parentResource: ImportResource|n, parentNodeData: CG_Node|n)=>{
	const nodeType = CG_Node.GetNodeType(nodeData);
	const node = new NodeL1({
		type: nodeType,
		accessPolicy: context.nodeAccessPolicyID,
	});

	let orderKey = OrderKey.mid();
	const ownIndexUnderParent = path_indexes.Last();
	for (let i = 0; i < ownIndexUnderParent; i++) {
		orderKey = orderKey.next();
	}

	const parentNodeType = parentNodeData ? CG_Node.GetNodeType(parentNodeData) : context.importUnderNode.type;
	const link = new NodeLink({
		group:
			// if this parent->child link is valid using child-group "generic", then do that
			NodeType_Info.for[parentNodeType].childGroup_childTypes.get(ChildGroup.generic)?.includes(nodeType)
				? ChildGroup.generic
				// else, fall back to using the "freeform" child-group
				: ChildGroup.freeform,
		orderKey: orderKey.toString(),
		//form: claimForm,
	});
	if (nodeType == NodeType.argument) {
		link.polarity = Polarity.supporting;
	}

	const mainTitle = CG_Node.GetText(nodeData);
	const revision = new NodeRevision({
		displayDetails: undefined,
		attachments: CG_Node.GetAttachments(nodeData),
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