import {NodeChildLink, MapNode, NodeRevision, NodeType, systemUserID, CullNodePhrasingToBeEmbedded, NodePhrasing, ChildGroup, AddChildNode} from "dm_common";
import {Assert} from "react-vextensions/Dist/Internals/FromJSVE";
import {Command} from "web-vcore/nm/mobx-graphlink.js";

export enum DataExchangeFormat {
	json_dm = "json_dm",
	//json_cd = "json_cd",
	csv_sl = "csv_sl",
}

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
	link: NodeChildLink;
	node: MapNode;
	revision: NodeRevision;
	CanSearchByTitle() {
		return this.revision.phrasing.text_base.trim().length > 0;
	}

	// note: this "insert path" has node-titles as its segments, rather than node-ids
	// (each node-id is found by traversing descendants, down from the node that the import command was started from)
	insertPath?: string[];
}