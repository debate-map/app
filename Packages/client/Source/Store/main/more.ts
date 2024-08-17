import {O} from "web-vcore";
import {makeObservable} from "mobx";

export class MorePageState {
	constructor() { makeObservable(this); }
	@O subpage: string;

	// more page
	@O graphqlTestQuery = `
		query {
			searchSubtree(rootNodeId: "???", maxDepth: 3, query: "???", searchLimit: 3) {
				nodeId
				rank
				type
				foundText
				nodeText
			}
		}
	`.AsMultiline(0);
}