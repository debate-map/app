import {Media, NodeL1, NodeLink, NodePhrasing, NodeRevision, Term} from "dm_common";
import {ClassKeys} from "mobx-graphlink";

export enum SubtreeOperation {
	export = "export",
	setAccessPolicy = "setAccessPolicy",
	delete = "delete",
}

export class SubtreeIncludeKeys {
	constructor(data?: Partial<SubtreeIncludeKeys>) {
		Object.assign(this, data);
	}
	//nodes = ClassKeys<NodeL3>("id", "type", "rootNodeForMap", "c_currentRevision", "multiPremiseArgument", "argumentType");
	nodes = ClassKeys<NodeL1>("id", "type", "rootNodeForMap", "c_currentRevision", "multiPremiseArgument", "argumentType");
	nodeLinks = ClassKeys<NodeLink>("id", "parent", "child", "form", "polarity");
	nodeRevisions = ClassKeys<NodeRevision>("id", "node", "phrasing", "attachments");
	nodePhrasings = ClassKeys<NodePhrasing>("id", "node", "type", "text_base", "text_negation", "text_question", "text_narrative", "note", "terms", "references");
	terms = ClassKeys<Term>("id", "name", "forms", "disambiguation", "type", "definition", "note");
	medias = ClassKeys<Media>("id", "name", "type", "url", "description");
}