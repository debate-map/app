import {GetExpandedByDefaultAttachment, GetMedia, GetNode, GetNodeChildren, GetNodeChildrenL2, GetNodeChildrenL3, GetNodeL3, GetNodePhrasings, GetTermsAttached, Media, NodeL1, NodeL3, NodeLink, NodePhrasing, NodeRevision, NodeTag, Term} from "dm_common";
import {gql} from "web-vcore/nm/@apollo/client";
import {Assert, NN} from "web-vcore/nm/js-vextensions.js";
import {ClassKeys, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {SubtreeIncludeKeys} from "./SubtreeOpsStructs.js";

export class SubtreeData_Server {
	constructor(data?: Partial<SubtreeData_Server>) {
		Object.assign(this, data);
	}
	nodes?: NodeL1[];
	nodeLinks?: NodeLink[];
	nodeRevisions?: NodeRevision[];
	nodePhrasings?: NodePhrasing[];
	terms?: Term[];
	medias?: Media[];
	nodeTags?: NodeTag[];
}
export function GetServerSubtreeData_GQLQuery(rootNodeID: string, maxExportDepth: number, includeKeys: SubtreeIncludeKeys) {
	const Fields = (fields: string[], fieldSubfieldsStrings: {[key: string]: string} = {})=>{
		if (fields.length == 0) return "__typename";
		return fields.map(field=>{
			if (fieldSubfieldsStrings[field] != null) {
				return `${field} { ${fieldSubfieldsStrings[field]} }`;
			}
			return field;
		}).join(" ");
	};
	return gql`
	{
		subtree(rootNodeId: "${rootNodeID}", maxDepth: ${maxExportDepth}) {
			nodes { ${Fields(includeKeys.nodes)} }
			nodeLinks { ${Fields(includeKeys.nodeLinks)} }
			nodeRevisions { ${Fields(includeKeys.nodeRevisions, {phrasing: "text_base text_negation text_question text_narrative note terms { id }", attachments: "equation references quote media description"})} }
			nodePhrasings { ${Fields(includeKeys.nodePhrasings, {terms: "id"})} }
			terms { ${Fields(includeKeys.terms, {attachments: "equation references quote media"})} }
			medias { ${Fields(includeKeys.medias)} }
			#nodeTags { $###{Fields(includeKeys.nodeTags, {labels: "nodeX labels"})} }
		}
	}`;
}

/*export const ConvertServerSubtreeDataToSubtreeSearchInfoStructure = CreateAccessor((rootPath: string, data: ServerSubtreeData): GetSubtree_SearchInfo=>{
	return new GetSubtree_SearchInfo({
		rootPathSegments: rootPath.split("/"),
		nodes: data.nodes.ToMap(a=>a.id, a=>a),
		nodeLinks: data.nodeLinks.ToMap(a=>a.id, a=>a),
		nodeRevisions: data.nodeRevisions.ToMap(a=>a.id, a=>a),
		nodePhrasings: data.nodePhrasings.ToMap(a=>a.id, a=>a),
		terms: data.terms.ToMap(a=>a.id, a=>a),
		medias: data.medias.ToMap(a=>a.id, a=>a),
	});
});*/
export const ConvertLocalSubtreeDataToServerStructure = CreateAccessor((searchInfo: SubtreeData_Local): SubtreeData_Server=>{
	return new SubtreeData_Server({
		nodes: Array.from(searchInfo.nodes.values()),
		nodeLinks: Array.from(searchInfo.nodeLinks.values()),
		nodeRevisions: Array.from(searchInfo.nodeRevisions.values()),
		nodePhrasings: Array.from(searchInfo.nodePhrasings.values()),
		terms: Array.from(searchInfo.terms.values()),
		medias: Array.from(searchInfo.medias.values()),
		nodeTags: [],
	});
});

export class GetSubtree_SearchConfig {
	maxDepth: number;
	//simplifyOutput: boolean;
}
export class SubtreeData_Local {
	constructor(data: Partial<SubtreeData_Local>) {
		Object.assign(this, data);
	}

	// temp
	rootPathSegments: string[];
	//nodes_nextToProcess: NodeL2[] = [];

	// result
	//nodes = new Map<string, NodeL3>();
	nodes = new Map<string, NodeL1>();
	nodeLinks = new Map<string, NodeLink>();
	nodeRevisions = new Map<string, NodeRevision>();
	nodePhrasings = new Map<string, NodePhrasing>();
	terms = new Map<string, Term>();
	medias = new Map<string, Media>();
}

/**
 * Note: This differs from the server-based subtree-retrieval in a few ways:
 * * The "node" entries contain some additional fields -- those seen in NodeL2 and NodeL3.
*/
export const PopulateLocalSubtreeData = CreateAccessor((currentPath: string, searchConfig: GetSubtree_SearchConfig, subtreeData?: SubtreeData_Local)=>{
	const pathSegments = currentPath.split("/");
	subtreeData = subtreeData ?? new SubtreeData_Local({rootPathSegments: pathSegments});

	const node = NN(GetNodeL3(currentPath));
	// stick with just the raw node row's data (ie. NodeL1), to match with the server-based "subtree" endpoint's data
	//const node = NN(GetNode(currentPath));

	// check link first, because link can differ depending on path (ie. even if node has been seen, this link may not have been)
	const isSubtreeRoot = pathSegments.join("/") == subtreeData.rootPathSegments.join("/");
	if (node.link && !isSubtreeRoot && !subtreeData.nodeLinks.has(node.link.id)) subtreeData.nodeLinks.set(node.link.id, node.link);

	// now check if node itself has been seen/processed; if so, ignore the rest of its data
	if (subtreeData.nodes.has(node.id)) return subtreeData;
	subtreeData.nodes.set(node.id, node);

	Assert(!subtreeData.nodeRevisions.has(node.c_currentRevision), `Node-revisions should be node-specific, yet entry (${node.c_currentRevision}) was seen twice.`);
	subtreeData.nodeRevisions.set(node.c_currentRevision, node.current);

	const phrasings = GetNodePhrasings(node.id);
	for (const phrasing of phrasings) {
		Assert(!subtreeData.nodePhrasings.has(phrasing.id), `Node-phrasings should be node-specific, yet entry (${phrasing.id}) was seen twice.`);
		subtreeData.nodePhrasings.set(phrasing.id, phrasing);
	}

	const terms = GetTermsAttached(node.c_currentRevision).filter(a=>a) as Term[];
	for (const term of terms) {
		if (!subtreeData.terms.has(term.id)) subtreeData.terms.set(term.id, term);
	}

	const mainAttachment = GetExpandedByDefaultAttachment(node.current);
	if (mainAttachment?.media && !subtreeData.terms.has(mainAttachment?.media.id)) {
		const media = GetMedia(mainAttachment?.media.id)!;
		subtreeData.medias.set(media.id, media);
	}

	const currentDepth = pathSegments.length - subtreeData.rootPathSegments.length;
	if (currentDepth < searchConfig.maxDepth) {
		//for (const child of GetNodeChildrenL3(node.id, currentPath)) { // todo: maybe switch to this, for correct handling of mirror-children
		for (const child of GetNodeChildren(node.id)) {
			PopulateLocalSubtreeData(`${currentPath}/${child.id}`, searchConfig, subtreeData);
		}
	}
	return subtreeData;
});
/*async function LogSelectedSubtree() {
	let state = store.getState();
	let selectedPath = RR.GetSelectedNodePath(state.main.page == "global" ? RR.globalMapID : state.main[state.main.page].selectedMapID);
	let subtree = await GetAsync(()=>{
		let selectedNode = RR.GetNodeL3(selectedPath);
		let selectedNode_parent = RR.GetParentNodeL3(selectedPath);
		let selectedPath_final = selectedPath;
		if (RR.IsPremiseOfSinglePremiseArgument(selectedNode, selectedNode_parent)) {
			selectedPath_final = RR.SlicePath(selectedPath, 1);
		}
		return GetSubtree(selectedPath_final);
	});
	console.log(ToJSON(subtree));
}*/