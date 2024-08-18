import {Media, NodeL1, NodeLink, NodePhrasing, NodeRevision, Term} from "dm_common";
import {makeObservable} from "mobx";
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
		makeObservable(this);
	}
	//@O nodes = ClassKeys<NodeL3>("id", "type", "rootNodeForMap", "c_currentRevision", "multiPremiseArgument", "argumentType");
	@O nodes = ClassKeys<NodeL1>("id", "type", "rootNodeForMap", "c_currentRevision", "multiPremiseArgument", "argumentType");
	@O nodeLinks = ClassKeys<NodeLink>("id", "parent", "child", "form", "polarity");
	@O nodeRevisions = ClassKeys<NodeRevision>("id", "node", "phrasing", "attachments");
	@O nodePhrasings = ClassKeys<NodePhrasing>("id", "node", "type", "text_base", "text_negation", "text_question", "text_narrative", "note", "terms", "references");
	@O terms = ClassKeys<Term>("id", "name", "forms", "disambiguation", "type", "definition", "note");
	@O medias = ClassKeys<Media>("id", "name", "type", "url", "description");
}