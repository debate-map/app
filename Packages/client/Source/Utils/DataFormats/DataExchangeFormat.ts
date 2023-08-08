import {NodeLink, NodeL1, NodeRevision, NodeType, systemUserID, CullNodePhrasingToBeEmbedded, NodePhrasing, ChildGroup, AddChildNode} from "dm_common";
import {GetEntries} from "js-vextensions";
import {Assert} from "react-vextensions/Dist/Internals/FromJSVE";
import {Command} from "web-vcore/nm/mobx-graphlink.js";

export enum DataExchangeFormat {
	json_dm = "json_dm",
	csv_basic = "csv_basic",

	// planned
	//json_cd = "json_cd",

	// deprecated
	csv_sl = "csv_sl", // old; import-only
}
export const DataExchangeFormat_entries = GetEntries(DataExchangeFormat, val=>{
	if (val == DataExchangeFormat.json_dm) return "JSON (DM)";
	if (val == DataExchangeFormat.csv_basic) return "CSV (basic)";
	if (val == DataExchangeFormat.csv_sl) return "CSV (SL)";
	return val;
});
export const DataExchangeFormat_entries_supportedBySubtreeImporter = DataExchangeFormat_entries.filter(a=>[DataExchangeFormat.json_dm, DataExchangeFormat.csv_sl].includes(a.value));
export const DataExchangeFormat_entries_supportedBySubtreeExporter = DataExchangeFormat_entries.filter(a=>[DataExchangeFormat.json_dm, DataExchangeFormat.csv_basic].includes(a.value));

// shared import structures
// ==========

export class ImportResource {
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
		return this.revision.phrasing.text_base.trim().length > 0;
	}

	// note: this "insert path" has node-titles as its segments, rather than node-ids
	// (each node-id is found by traversing descendants, down from the node that the import command was started from)
	insertPath?: string[];
}