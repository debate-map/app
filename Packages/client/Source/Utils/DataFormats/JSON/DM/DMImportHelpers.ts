import {ChildGroup, NodeL1, NodeLink, NodeRevision, NodeType, OrderKey} from "dm_common";
import {Assert} from "js-vextensions";
import {CreateAccessor} from "mobx-graphlink";
import {ImportResource, IR_NodeAndRevision} from "Utils/DataFormats/DataExchangeFormat.js";
import {DMSubtreeData} from "./DMSubtreeData.js";

// these take an entry's export, and remove fields that are not possible to import (ie. include in add-x command)
// todo: fix the typings so that the "as X" at end aren't needed
const CleanLink = (link: NodeLink)=>link.ExcludeKeys(...[
	"id", "creator", "createdAt", "parent", "child", "c_parentType", "c_childType",
] as const) as NodeLink;
const CleanNode = (node: NodeL1)=>node.ExcludeKeys(...[
	"id", "creator", "createdAt",
	"rootNodeForMap", // technically, this field can be provided as part of NodeInput struct, but almost never makes sense for imports
] as const) as NodeL1;
const CleanRevision = (rev: NodeRevision)=>rev.ExcludeKeys(...[
	"id", "creator", "createdAt", "node", "replacedBy",
] as const) as NodeRevision;

export const GetResourcesInImportSubtree_JsonDm = CreateAccessor((data: DMSubtreeData, parentNode: NodeL1)=>{
	const result = [] as ImportResource[];

	// this function reads the data in the DMSubtreeData, traversing it as a tree/graph (using the nodeLinks collection), and piecing that data into IR_NodeAndRevision entries
	// (the IR_NodeAndRevision entries are what the import-dialog uses to display the data, and to allow the user to select which parts to import)
	const nodeMap = data.nodes!.ToMap(a=>a.id, a=>a);
	//const linkMap = data.nodeLinks!.ToMap(a=>a.id, a=>a);
	const revMap = data.nodeRevisions!.ToMap(a=>a.id, a=>a);
	/*const phrasingMap = data.nodePhrasings!.ToMap(a=>a.id, a=>a);
	const termMap = data.terms!.ToMap(a=>a.id, a=>a);
	const mediaMap = data.medias!.ToMap(a=>a.id, a=>a);
	const tagMap = data.nodeTags!.ToMap(a=>a.id, a=>a);*/

	// root-node is the one node that has no parent
	const allNodeIDs = data.nodes!.map(a=>a.id);
	const allChildIDs = data.nodeLinks!.map(a=>a.child);
	const nodeIDsThatAreNeverParents = allNodeIDs.Exclude(...allChildIDs);
	Assert(nodeIDsThatAreNeverParents.length == 1, `Expected exactly 1 node to have no parent, but found ${nodeIDsThatAreNeverParents.length}.`);

	const rootNode = nodeMap.get(nodeIDsThatAreNeverParents[0])!;
	const rootNodeRev = revMap.get(rootNode.c_currentRevision)!;
	const rootNode_path = [0];
	const rootNode_resource = new IR_NodeAndRevision({
		link: CleanLink(new NodeLink({
			group: parentNode.type == NodeType.category ? ChildGroup.generic : ChildGroup.freeform,
			orderKey: OrderKey.mid().toString(),
		})),
		node: CleanNode(rootNode),
		revision: CleanRevision(rootNodeRev),
		pathInData: rootNode_path,
	});
	result.push(rootNode_resource);

	type LayerEntry = {node: NodeL1, path: number[], resource: IR_NodeAndRevision};
	let currentNodeLayer: LayerEntry[] = [{node: rootNode, path: rootNode_path, resource: rootNode_resource}];
	while (currentNodeLayer.length) {
		const nextNodeLayer = [] as LayerEntry[];
		for (const entry of currentNodeLayer) {
			const {path, node} = entry;
			const childLinks = data.nodeLinks!.filter(a=>a.parent == node.id);
			for (const [linkI, link] of childLinks.entries()) {
				const childID = link.child;
				const childNode = nodeMap.get(childID)!;
				const childRev = revMap.get(childNode.c_currentRevision)!;
				/*const childPhrasing = phrasingMap.get(childRev.phrasing)!;
				const childTerms = childRev.terms.map(id=>termMap.get(id)!);
				const childMedia = childRev.attachments.map(a=>{
					if (a.media == null) return null;
					return mediaMap.get(a.media.id);
				}).filter(a=>a);*/

				const childPath = [...path, linkI];
				const childResource = new IR_NodeAndRevision({
					link: CleanLink(link),
					node: CleanNode(childNode),
					revision: CleanRevision(childRev),
					pathInData: childPath,
					insertPath_parentResourceLocalID: entry.resource.localID,
				});
				result.push(childResource);

				nextNodeLayer.push({node: childNode, path: childPath, resource: childResource});
			}
		}
		currentNodeLayer = nextNodeLayer;
	}

	return result;
});