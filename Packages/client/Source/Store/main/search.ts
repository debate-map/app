import {O} from "web-vcore";

export class SearchState {
	@O accessor queryStr: string;
	@O accessor searchResults_partialTerms = [] as string[];
	@O accessor searchResults_nodeIDs = [] as string[];

	@O accessor findNode_state = "inactive" as "inactive" | "activating" | "active";
	@O accessor findNode_node: string|n;
	// @O accessor findNode_type: 'FindContainingMaps' | 'FindInCurrentMap';
	@O accessor findNode_resultPaths = [] as string[];
	@O accessor findNode_currentSearchDepth = 0 as number;
}