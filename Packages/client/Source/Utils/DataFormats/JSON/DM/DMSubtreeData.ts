import {NodeL1, NodeLink, NodeRevision, NodePhrasing, Term, Media, NodeTag} from "dm_common";

export class DMSubtreeData {
	constructor(data?: Partial<DMSubtreeData>) {
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