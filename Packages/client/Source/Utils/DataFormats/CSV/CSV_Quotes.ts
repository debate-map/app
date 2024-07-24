import {ClaimForm, GetNodeTitleFromPhrasingAndForm, Media, NodeL1, NodeL3, NodeLink, NodePhrasing, NodeRevision, NodeType, QuoteAttachment, Source, Term} from "dm_common";
import {ClassKeys} from "web-vcore/nm/mobx-graphlink";
import {CSVCell} from "./CSV_Basic";
import {SubtreeIncludeKeys} from "../../../UI/@Shared/Maps/Node/NodeUI_Menu/Dialogs/SubtreeOpsStructs.js";
import {DMSubtreeData} from "../JSON/DM/DMSubtreeData.js";

export const csv_quotes_includeKeys = new SubtreeIncludeKeys({
	nodes: ClassKeys<NodeL1>("c_currentRevision"),
	nodeLinks: ClassKeys<NodeLink>(),
	nodeRevisions: ClassKeys<NodeRevision>("id", "phrasing", "attachments"),
	nodePhrasings: ClassKeys<NodePhrasing>(),
	terms: ClassKeys<Term>(),
	medias: ClassKeys<Media>(),
});

export function SubtreeDataToString_CSV_Quotes(data: DMSubtreeData, rootNode: NodeL3, maxExportDepth: number) {
	// NOTE: If you add new field-accesses in code below, make sure to update the "includeKeys_final" above to include the new fields.
	const csvLines = [] as string[];
	csvLines.push(["Node text", "Quote text", "Quote source url"].join(",")); // headers

	for (const node of data.nodes!) {
		const rev = data.nodeRevisions!.find(a=>a.id == node.c_currentRevision)!;

		const displayText = GetNodeTitleFromPhrasingAndForm(rev.phrasing, ClaimForm.base);

		const quotes = rev.attachments.map(a=>a.quote).filter(a=>a) as QuoteAttachment[] ?? [];
		for (const quote of quotes) {
			// Treating each source in a source-chain is arguably "not correct" for how debate-map intends source-chains to be used. (where sources that are original/intermediaries/outer are distinct)
			// Since SL doesn't always use source-chains this way however, it's fine to just treat all the sources in all the chains the same way. (and thus extract them into a flat list with SelectMany)
			const sourceUrls: string[] = quote.sourceChains.SelectMany(a=>a.sources).map(a=>a.link).filter(a=>a != null) as string[] ?? [];
			for (const sourceUrl of sourceUrls) {
				if (sourceUrl.includes("web.archive.org")) continue; // ignore archive.org links (not useful for the purposes of these exports)
				const csvCells = [] as string[];
				csvCells.push(CSVCell(displayText.rawTitle || "n/a"));
				csvCells.push(CSVCell(quote?.content || "n/a"));
				csvCells.push(CSVCell(sourceUrl || "n/a"));
				csvLines.push(csvCells.join(","));
			}
		}
	}

	return csvLines.join("\n");
}