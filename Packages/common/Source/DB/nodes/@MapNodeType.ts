import {Assert, CE, CreateStringEnum, GetValues, GetValues_ForSchema} from "web-vcore/nm/js-vextensions.js";
import {AddSchema} from "web-vcore/nm/mobx-graphlink";
import {ClaimForm, MapNode, MapNodeL3, Polarity} from "./@MapNode.js";

export enum MapNodeType {
	category = "category",
	package = "package",
	multiChoiceQuestion = "multiChoiceQuestion",
	claim = "claim",
	argument = "argument",
}
//AddSchema("MapNodeType", {enum: GetValues(MapNodeType)});
AddSchema("MapNodeType", {enum: GetValues(MapNodeType)});

export class MapNodeType_Info {
	static for = {
		[MapNodeType.category]: new MapNodeType_Info({
			childTypes: [MapNodeType.category, MapNodeType.package, MapNodeType.multiChoiceQuestion, MapNodeType.claim],
			minWidth: 100, maxWidth: 250,
			/*mainRatingTypes: ["significance"],
			otherRatingTypes: [],*/
		}),
		[MapNodeType.package]: new MapNodeType_Info({
			childTypes: [MapNodeType.claim],
			minWidth: 100, maxWidth: 250,
			/* mainRatingTypes: ["significance"],
			otherRatingTypes: [], */
		}),
		[MapNodeType.multiChoiceQuestion]: new MapNodeType_Info({
			childTypes: [MapNodeType.claim],
			minWidth: 100, maxWidth: 250,
			// minWidth: 100, maxWidth: 200, backgroundColor: "230,150,50",
			/* mainRatingTypes: ["significance"],
			otherRatingTypes: [], */
		}),
		[MapNodeType.claim]: new MapNodeType_Info({
			childTypes: [MapNodeType.argument],
			minWidth: 350, maxWidth: 600,
			// mainRatingTypes: ["probability", "intensity"],
			// mainRatingTypes: ["probability", "support"],
			/* mainRatingTypes: ["probability", "truth"],
			otherRatingTypes: [], */
		}),
		[MapNodeType.argument]: new MapNodeType_Info({
			childTypes: [MapNodeType.claim, MapNodeType.argument],
			minWidth: 100, maxWidth: 300,
			/* mainRatingTypes: ["strength"],
			otherRatingTypes: [], */
		}),
	} as {[key: string]: MapNodeType_Info};

	private constructor(initialData: Partial<MapNodeType_Info>) {
		CE(this).VSet(initialData);
	}

	// displayName: (parentNode: MapNodeL2)=>string;
	childTypes: MapNodeType[];
	minWidth: number;
	maxWidth: number;
	// fontSize?: number;
	// get fontSize() { return 14; }
	/* mainRatingTypes: RatingType[];
	otherRatingTypes: RatingType[]; */
}

export function GetMapNodeTypeDisplayName(type: MapNodeType, parentNode: MapNode, parentNodeForm: ClaimForm, polarity: Polarity) {
	if (type == MapNodeType.category) return "category";
	if (type == MapNodeType.package) return "package";
	if (type == MapNodeType.multiChoiceQuestion) return "multi-choice question";
	if (type == MapNodeType.claim) {
		if (parentNode && parentNode.type == MapNodeType.category) { return "claim (in question form)"; }
		return "claim";
	}
	if (type == MapNodeType.argument) {
		return polarity == Polarity.supporting ? "supporting argument" : "opposing argument";
	}
	Assert(false, "Invalid node type.");
}