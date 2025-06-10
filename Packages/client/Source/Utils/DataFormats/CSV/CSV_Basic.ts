import {ClaimForm, GetNodeTitleFromPhrasingAndForm, Media, NodeL1, NodeL3, NodeLink, NodePhrasing, NodeRevision, NodeType, Term} from "dm_common";
import {ClassKeys} from "mobx-graphlink";
import {SubtreeIncludeKeys} from "../../../UI/@Shared/Maps/Node/NodeUI_Menu/Dialogs/SubtreeOps/SubtreeOpsStructs.js";
import {DMSubtreeData} from "../JSON/DM/DMSubtreeData.js";

export const csv_basic_includeKeys = new SubtreeIncludeKeys({
	nodes: ClassKeys<NodeL1>("id", "type", "c_currentRevision"),
	nodeLinks: ClassKeys<NodeLink>("parent", "child", "form", "polarity"),
	nodeRevisions: ClassKeys<NodeRevision>("id", "phrasing"),
	nodePhrasings: ClassKeys<NodePhrasing>(),
	terms: ClassKeys<Term>(),
	medias: ClassKeys<Media>(),
});

export function CSVCell(text: string, escapeQuotesByDoubling = true) {
	let result = text;
	text = text.trim(); // remove extra spaces at start/end (dunno why, but some users seem to add them fairly frequently)
	if (result.includes(`"`)) {
		// Google Sheets expects quotes to be escaped by doubling them: Cell1,Cell2,cell which has ""special characters"" in it
		if (escapeQuotesByDoubling) {
			result = result.replace(/"/g, `""`);
		} else {
			result = result.replace(/"/g, `\\"`);
		}
	}
	if (result.includes(",") || result.includes("\n")) result = `"${result}"`;
	return result;
}

export function SubtreeDataToString_CSV_Basic(data: DMSubtreeData, rootNode: NodeL3, maxExportDepth: number) {
	// NOTE: If you add new field-accesses in code below, make sure to update the "includeKeys_final" above to include the new fields.
	function EnhanceNode(path: string, node: NodeL1, link?: NodeLink|n) {
		const rev = data.nodeRevisions!.find(a=>a.id == node.c_currentRevision)!;
		const childLinks = data.nodeLinks!.filter(a=>a.parent == node.id);
		const childNodes = childLinks.map(a=>data.nodes!.find(b=>b.id == a.child)!);
		let displayText = GetNodeTitleFromPhrasingAndForm(rev.phrasing, link?.form ?? ClaimForm.base);
		if (!displayText.rawTitle) {
			const textParts = [`untitled ${node.type}`];
			if (node.type == NodeType.argument && link?.polarity != null) {
				textParts.push(link.polarity == "supporting" ? "(pro)" : "(con)");
			}
			displayText = {...displayText, rawTitle: `<${textParts.join(" ")}>`};
		}
		const childNodes_enhanced = childNodes
			.filter(child=>!path.split("/").includes(child.id)) // ignore children already part of current-path (to avoid recursion-loops)
			.map(child=>EnhanceNode(`${path}/${child.id}`, child, childLinks.find(a=>a.child == child.id)));
		return {...node, path, displayText, childNodes_enhanced};
	}
	type NodeEnhanced = ReturnType<typeof EnhanceNode>;
	const rootNode_enhanced = EnhanceNode(rootNode.id, data.nodes!.find(a=>a.id == rootNode.id)!);

	const csvLines = [] as string[];
	csvLines.push([...Array(maxExportDepth + 1).keys()].map(depth=>CSVCell(`Node depth ${depth}`)).join(",")); // headers
	function PrintNodeToCSV(node: NodeEnhanced) {
		const csvCells = [] as string[];
		for (const parentID of node.path.split("/").slice(0, -1)) {
			csvCells.push(CSVCell(""));
		}
		csvCells.push(CSVCell(node.displayText.rawTitle ?? ""));
		csvLines.push(csvCells.join(","));
		for (const child of node.childNodes_enhanced) {
			PrintNodeToCSV(child);
		}
	}
	PrintNodeToCSV(rootNode_enhanced);

	return csvLines.join("\n");
}