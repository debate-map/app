import {NodeLink, NodeL1, NodeRevision, NodeType, systemUserID, CullNodePhrasingToBeEmbedded, NodePhrasing, ChildGroup, AddChildNode} from "dm_common";
import {GetEntries} from "js-vextensions";
import {Assert} from "react-vextensions/Dist/Internals/FromJSVE";
import {Command} from "web-vcore/nm/mobx-graphlink.js";

export enum DataExchangeFormat {
	json_dm = "json_dm",
	json_cg = "json_cg",
	csv_basic = "csv_basic",

	// planned
	//json_cd = "json_cd",

	// deprecated
	csv_sl = "csv_sl", // old; import-only
}
export const DataExchangeFormat_entries = GetEntries(DataExchangeFormat, val=>{
	if (val == DataExchangeFormat.json_dm) return "JSON (debate-map)";
	if (val == DataExchangeFormat.json_cg) return "JSON (claim-gen)";
	if (val == DataExchangeFormat.csv_basic) return "CSV (basic)";
	if (val == DataExchangeFormat.csv_sl) return "CSV (sl)";
	return val;
});
export const DataExchangeFormat_entries_supportedBySubtreeImporter = DataExchangeFormat_entries.filter(a=>{
	return [
		DataExchangeFormat.json_dm,
		DataExchangeFormat.json_cg,
		DataExchangeFormat.csv_sl,
	].includes(a.value);
});
export const DataExchangeFormat_entries_supportedBySubtreeExporter = DataExchangeFormat_entries.filter(a=>{
	return [
		DataExchangeFormat.json_dm,
		DataExchangeFormat.csv_basic,
	].includes(a.value);
});

// shared import structures
// ==========

export class ImportResource {
	/** For a given resource, the sequence of indexes that its ancestors had, within each of their parents' children-lists. (atm only displayed in import-dialog for reference purposes) */
	pathInData: number[];
}
export class IR_NodeAndRevision extends ImportResource {
	constructor(data?: Partial<IR_NodeAndRevision>) {
		super();
		Object.assign(this, data);
	}
	link: NodeLink;
	node: NodeL1;
	revision: NodeRevision;
	CanSearchByTitle() {
		return (this.revision.phrasing.text_base ?? "").trim().length > 0
			|| (this.revision.phrasing.text_question ?? "").trim().length > 0;
	}

	// note: this "insert path" has node-titles as its segments, rather than node-ids
	// (each node-id is found by traversing descendants, down from the node that the import command was started from)
	insertPath_titles?: string[];

	// used to check if the node is already in the map; arguably redundant, but added to ensure uses same title-getting process as for ancestors (through insertPath_titles)
	ownTitle?: string;
}