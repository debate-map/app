import {O} from "web-vcore";

export class MorePageState {
	@O accessor subpage: string;

	// more page
	@O accessor graphqlTestQuery = `
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