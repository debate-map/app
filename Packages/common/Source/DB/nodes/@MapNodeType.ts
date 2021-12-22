import {Assert, CE, CreateStringEnum, GetValues, GetValues_ForSchema} from "web-vcore/nm/js-vextensions.js";
import {AddSchema} from "web-vcore/nm/mobx-graphlink";
import {ClaimForm, MapNode, MapNodeL3, Polarity} from "./@MapNode.js";

export enum ChildGroup {
	generic = "generic",
	truth = "truth",
	relevance = "relevance",
	// testing
	neutrality = "neutrality",
	freeform = "freeform",
}
AddSchema("ChildGroup", {enum: GetValues(ChildGroup)});

export enum MapNodeType {
	category = "category",
	package = "package",
	multiChoiceQuestion = "multiChoiceQuestion",
	claim = "claim",
	argument = "argument",
}
//AddSchema("MapNodeType", {enum: GetValues(MapNodeType)});
AddSchema("MapNodeType", {enum: GetValues(MapNodeType)});

const freeformTypes = [MapNodeType.category, MapNodeType.package, MapNodeType.multiChoiceQuestion, MapNodeType.claim, MapNodeType.argument];

export class MapNodeType_Info {
	static for = {
		[MapNodeType.category]: new MapNodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.generic, [MapNodeType.category, MapNodeType.package, MapNodeType.multiChoiceQuestion, MapNodeType.claim]],
				[ChildGroup.freeform, freeformTypes],
			]),
			minWidth: 150, maxWidth: 250,
			/*mainRatingTypes: ["significance"],
			otherRatingTypes: [],*/
		}),
		[MapNodeType.package]: new MapNodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.generic, [MapNodeType.claim]],
				[ChildGroup.freeform, freeformTypes],
			]),
			minWidth: 150, maxWidth: 250,
			/* mainRatingTypes: ["significance"],
			otherRatingTypes: [], */
		}),
		[MapNodeType.multiChoiceQuestion]: new MapNodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.generic, [MapNodeType.claim]],
				[ChildGroup.freeform, freeformTypes],
			]),
			minWidth: 150, maxWidth: 600,
			// minWidth: 100, maxWidth: 200, backgroundColor: "230,150,50",
			/* mainRatingTypes: ["significance"],
			otherRatingTypes: [], */
		}),
		[MapNodeType.claim]: new MapNodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.truth, [MapNodeType.argument]],
				[ChildGroup.freeform, freeformTypes],
			]),
			minWidth: 350, maxWidth: 600,
			// mainRatingTypes: ["probability", "intensity"],
			// mainRatingTypes: ["probability", "support"],
			/* mainRatingTypes: ["probability", "truth"],
			otherRatingTypes: [], */
		}),
		[MapNodeType.argument]: new MapNodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.generic, [MapNodeType.claim]],
				[ChildGroup.relevance, [MapNodeType.argument]],
				[ChildGroup.freeform, freeformTypes],
			]),
			minWidth: 150, maxWidth: 600,
			/* mainRatingTypes: ["strength"],
			otherRatingTypes: [], */
		}),
	} as {[key: string]: MapNodeType_Info};

	private constructor(initialData: Partial<MapNodeType_Info>) {
		CE(this).VSet(initialData);
	}

	// displayName: (parentNode: MapNodeL2)=>string;
	childGroup_childTypes: Map<ChildGroup, MapNodeType[]>;
	minWidth: number;
	maxWidth: number;
	// fontSize?: number;
	// get fontSize() { return 14; }
	/* mainRatingTypes: RatingType[];
	otherRatingTypes: RatingType[]; */
}
/*export function GetMapNodeTypeInfo(type: MapNodeType) {
	return MapNodeType_Info.for[type];
}*/

export function GetMapNodeTypeDisplayName(type: MapNodeType, parentNode: MapNode, parentNodeForm: ClaimForm, polarity: Polarity) {
	if (type == MapNodeType.category) return "category";
	if (type == MapNodeType.package) return "package";
	if (type == MapNodeType.multiChoiceQuestion) return "multi-choice question";
	if (type == MapNodeType.claim) {
		if (parentNode && parentNode.type == MapNodeType.category) { return "claim / binary question"; }
		return "claim";
	}
	if (type == MapNodeType.argument) {
		return polarity == Polarity.supporting ? "supporting argument" : "opposing argument";
	}
	Assert(false, "Invalid node type.");
}