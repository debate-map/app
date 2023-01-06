import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";

export class SearchState {
	constructor() { makeObservable(this); }

	@O queryStr: string;
	@O searchResults_partialTerms = [] as string[];
	@O searchResults_nodeIDs = [] as string[];

	@O findNode_state = "inactive" as "inactive" | "activating" | "active";
	@O findNode_node: string|n;
	// @O findNode_type: 'FindContainingMaps' | 'FindInCurrentMap';
	@O findNode_resultPaths = [] as string[];
	@O findNode_currentSearchDepth = 0 as number;
}