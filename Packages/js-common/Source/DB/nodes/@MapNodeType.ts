import {Assert, CE, CreateStringEnum, GetValues, GetValues_ForSchema} from "web-vcore/nm/js-vextensions.js";
import {AddSchema} from "web-vcore/nm/mobx-graphlink";
import {ClaimForm, MapNode, NodeL3, Polarity} from "./@MapNode.js";

export enum ChildGroup {
	generic = "generic",
	truth = "truth",
	relevance = "relevance",
	// testing
	neutrality = "neutrality",
	freeform = "freeform",
}
AddSchema("ChildGroup", {enum: GetValues(ChildGroup)});

export enum NodeType {
	category = "category",
	package = "package",
	multiChoiceQuestion = "multiChoiceQuestion",
	claim = "claim",
	argument = "argument",
}
//AddSchema("NodeType", {enum: GetValues(NodeType)});
AddSchema("NodeType", {enum: GetValues(NodeType)});

const freeformTypes = [NodeType.category, NodeType.package, NodeType.multiChoiceQuestion, NodeType.claim, NodeType.argument];

export class NodeType_Info {
	static for = {
		[NodeType.category]: new NodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.generic, [NodeType.category, NodeType.package, NodeType.multiChoiceQuestion, NodeType.claim]],
				[ChildGroup.freeform, freeformTypes],
			]),
			minWidth: 150, maxWidth: 250,
			/*mainRatingTypes: ["significance"],
			otherRatingTypes: [],*/
		}),
		[NodeType.package]: new NodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.generic, [NodeType.claim]],
				[ChildGroup.freeform, freeformTypes],
			]),
			minWidth: 150, maxWidth: 250,
			/* mainRatingTypes: ["significance"],
			otherRatingTypes: [], */
		}),
		[NodeType.multiChoiceQuestion]: new NodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.generic, [NodeType.claim]],
				[ChildGroup.freeform, freeformTypes],
			]),
			minWidth: 150, maxWidth: 600,
			// minWidth: 100, maxWidth: 200, backgroundColor: "230,150,50",
			/* mainRatingTypes: ["significance"],
			otherRatingTypes: [], */
		}),
		[NodeType.claim]: new NodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.truth, [NodeType.argument]],
				[ChildGroup.freeform, freeformTypes],
			]),
			minWidth: 350, maxWidth: 600,
			// mainRatingTypes: ["probability", "intensity"],
			// mainRatingTypes: ["probability", "support"],
			/* mainRatingTypes: ["probability", "truth"],
			otherRatingTypes: [], */
		}),
		[NodeType.argument]: new NodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.generic, [NodeType.claim]],
				[ChildGroup.relevance, [NodeType.argument]],
				[ChildGroup.freeform, freeformTypes],
			]),
			minWidth: 150, maxWidth: 600,
			/* mainRatingTypes: ["strength"],
			otherRatingTypes: [], */
		}),
	} as {[key: string]: NodeType_Info};

	private constructor(initialData: Partial<NodeType_Info>) {
		CE(this).VSet(initialData);
	}

	// displayName: (parentNode: NodeL2)=>string;
	childGroup_childTypes: Map<ChildGroup, NodeType[]>;
	minWidth: number;
	maxWidth: number;
	// fontSize?: number;
	// get fontSize() { return 14; }
	/* mainRatingTypes: RatingType[];
	otherRatingTypes: RatingType[]; */
}
/*export function GetNodeTypeInfo(type: NodeType) {
	return NodeType_Info.for[type];
}*/

export function GetNodeTypeDisplayName(type: NodeType, parentNode: MapNode, parentNodeForm: ClaimForm, polarity: Polarity) {
	if (type == NodeType.category) return "category";
	if (type == NodeType.package) return "package";
	if (type == NodeType.multiChoiceQuestion) return "multi-choice question";
	if (type == NodeType.claim) {
		if (parentNode && parentNode.type == NodeType.category) { return "claim / binary question"; }
		return "claim";
	}
	if (type == NodeType.argument) {
		return polarity == Polarity.supporting ? "supporting argument" : "opposing argument";
	}
	Assert(false, "Invalid node type.");
}