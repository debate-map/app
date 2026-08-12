import {Media, NodeL1, NodeLink, NodePhrasing, NodeRevision, Term} from "dm_common";
import {O} from "web-vcore";
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
	//@O accessor nodes = ClassKeys<NodeL3>("id", "type", "rootNodeForMap", "c_currentRevision", "multiPremiseArgument", "argumentType");
	@O accessor nodes = ClassKeys<NodeL1>("id", "type", "rootNodeForMap", "c_currentRevision", "multiPremiseArgument", "argumentType");
	@O accessor nodeLinks = ClassKeys<NodeLink>("id", "parent", "child", "form", "polarity");
	@O accessor nodeRevisions = ClassKeys<NodeRevision>("id", "node", "phrasing", "attachments");
	@O accessor nodePhrasings = ClassKeys<NodePhrasing>("id", "node", "type", "text_base", "text_negation", "text_question", "text_narrative", "note", "terms", "references");
	@O accessor terms = ClassKeys<Term>("id", "name", "forms", "disambiguation", "type", "definition", "note");
	@O accessor medias = ClassKeys<Media>("id", "name", "type", "url", "description");
}