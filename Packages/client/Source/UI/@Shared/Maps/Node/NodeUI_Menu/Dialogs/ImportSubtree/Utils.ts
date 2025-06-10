import {AsNodeL1Input, ChildGroup, CullNodePhrasingToBeEmbedded, GetNode, GetNodeChildrenL2, NodeL1, NodeLink, NodePhrasing, NodeRevision, NodeType} from "dm_common";
import {E} from "js-vextensions";
import {CreateAccessor, GetAsync} from "mobx-graphlink";
import {Assert} from "react-vextensions/Dist/Internals/FromJSVE";
import {GetOpenMapID} from "Store/main.js";
import {ImportResource, IR_NodeAndRevision} from "Utils/DataFormats/DataExchangeFormat.js";
import {RunCommand_AddChildNode} from "Utils/DB/Command.js";
import {CommandEntry, RunCommandBatch} from "Utils/DB/RunCommandBatch.js";

export async function ImportResourcesOnServer(resources: ImportResource[], mapID: string, importUnderNodeID: string, onProgress: (resourcesImported: number)=>void) {
	const commandEntries = resources.map(res=>{
		const parentResource = res instanceof IR_NodeAndRevision ? resources.find(a=>a.localID == res.insertPath_parentResourceLocalID) : null;
		const parentResource_indexInBatch = parentResource ? resources.indexOf(parentResource) : -1;
		if (res instanceof IR_NodeAndRevision && res.insertPath_parentResourceLocalID != null) {
			Assert(parentResource != null && parentResource_indexInBatch != -1, "Parent-resource not found in batch.");
		}

		const parentNodeIDOrPlaceholder = parentResource_indexInBatch != -1 ? "[placeholder; should be replaced by command-entry's field-override]" : importUnderNodeID;
		const [commandFunc, args] = GetCommandFuncAndArgsToCreateResource(res, GetOpenMapID(), parentNodeIDOrPlaceholder);

		let commandName: string;
		if (commandFunc == RunCommand_AddChildNode) commandName = "addChildNode";
		else Assert(false, "Unrecognized command function for batch import.");
		return E(
			{[commandName]: args},
			parentResource_indexInBatch != -1 && {setParentNodeToResultOfCommandAtIndex: parentResource_indexInBatch},
		) as CommandEntry;
	});

	return await RunCommandBatch(commandEntries, onProgress);
}

export function GetCommandFuncAndArgsToCreateResource(res: ImportResource, mapID: string|n, parentID: string) {
	if (res instanceof IR_NodeAndRevision) {
		return [RunCommand_AddChildNode, {
			mapID, parentID,
			node: AsNodeL1Input(res.node),
			revision: res.revision.ExcludeKeys("creator", "createdAt"),
			link: res.link,
		}] as const;
	}
	Assert(false, `Cannot generate command to create resource of type "${res.constructor.name}".`);
}
export async function CreateResource(res: ImportResource, mapID: string|n, parentID: string) {
	const [commandFunc, args] = GetCommandFuncAndArgsToCreateResource(res, mapID, parentID);
	await commandFunc(args);
}

export const ResolveNodeIDsForInsertPath = CreateAccessor((importUnderNodeID: string, insertPath: string[])=>{
	const resolvedNodeIDs = [] as (string|null)[];
	for (const segment of insertPath) {
		const prevNodeID = resolvedNodeIDs.length == 0 ? importUnderNodeID : resolvedNodeIDs.Last();
		const prevNodeChildren = prevNodeID != null ? GetNodeChildrenL2(prevNodeID) : [];
		const nodeForSegment = prevNodeChildren.find(a=>{
			return a.current.phrasing.text_base.trim() == segment.trim()
				// maybe temp; also match on text_question (needed atm for SL imports, but should maybe find a more elegant/generalizable way to handle this need)
				|| (a.current.phrasing.text_question ?? "").trim() == segment.trim()
				// maybe temp; also match on text_narrative (newer version of SL imports should use this instead of text_question)
				|| (a.current.phrasing.text_narrative ?? "").trim() == segment.trim();
		});
		resolvedNodeIDs.push(nodeForSegment?.id ?? null);
	}
	return resolvedNodeIDs;
});

export async function CreateAncestorForResource(res: ImportResource, mapID: string|n, parentIDOfNewNode: string, newNodeTitle: string, newNodeAccessPolicy: string): Promise<boolean> {
	const parentOfNewNode = await GetAsync(()=>GetNode(parentIDOfNewNode));
	if (parentOfNewNode == null) return false;
	await RunCommand_AddChildNode({
		mapID, parentID: parentIDOfNewNode,
		link: new NodeLink({
			group: parentOfNewNode.type == NodeType.category ? ChildGroup.generic : ChildGroup.freeform,
		}),
		node: AsNodeL1Input(new NodeL1({
			type: NodeType.category,
			accessPolicy: newNodeAccessPolicy,
			//creator: systemUserID,
		})),
		revision: new NodeRevision({
			//creator: systemUserID,
			phrasing: CullNodePhrasingToBeEmbedded(new NodePhrasing({
				text_base: newNodeTitle,
			})),
		}),
	});
	return true;
}