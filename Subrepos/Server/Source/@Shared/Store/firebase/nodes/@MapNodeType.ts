import chroma from "chroma-js";
import {Assert, CE} from "js-vextensions";
import {ClaimForm, MapNode, MapNodeL3, Polarity} from "./@MapNode";

export enum MapNodeType {
	Category = 10,
	Package = 20,
	MultiChoiceQuestion = 30,
	Claim = 40,
	Argument = 50,
}
export class MapNodeType_Info {
	static for = {
		[MapNodeType.Category]: new MapNodeType_Info({
			childTypes: [MapNodeType.Category, MapNodeType.Package, MapNodeType.MultiChoiceQuestion, MapNodeType.Claim],
			minWidth: 100, maxWidth: 250,
			/* mainRatingTypes: ["significance"],
			otherRatingTypes: [], */
		}),
		[MapNodeType.Package]: new MapNodeType_Info({
			childTypes: [MapNodeType.Claim],
			minWidth: 100, maxWidth: 250,
			/* mainRatingTypes: ["significance"],
			otherRatingTypes: [], */
		}),
		[MapNodeType.MultiChoiceQuestion]: new MapNodeType_Info({
			childTypes: [MapNodeType.Claim],
			minWidth: 100, maxWidth: 250,
			// minWidth: 100, maxWidth: 200, backgroundColor: "230,150,50",
			/* mainRatingTypes: ["significance"],
			otherRatingTypes: [], */
		}),
		[MapNodeType.Claim]: new MapNodeType_Info({
			childTypes: [MapNodeType.Argument],
			minWidth: 350, maxWidth: 550,
			// mainRatingTypes: ["probability", "intensity"],
			// mainRatingTypes: ["probability", "support"],
			/* mainRatingTypes: ["probability", "truth"],
			otherRatingTypes: [], */
		}),
		[MapNodeType.Argument]: new MapNodeType_Info({
			childTypes: [MapNodeType.Claim, MapNodeType.Argument],
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
export function GetNodeColor(node: MapNodeL3, type: "raw" | "background" = "background"): chroma.Color {
	let result;
	if (node.type == MapNodeType.Category) result = chroma("rgb(40,60,80)");
	else if (node.type == MapNodeType.Package) result = chroma("rgb(30,120,150)");
	else if (node.type == MapNodeType.MultiChoiceQuestion) result = chroma("rgb(90,50,180)");
	else if (node.type == MapNodeType.Claim) result = chroma("rgb(0,80,150)");
	else if (node.type == MapNodeType.Argument) {
		if (node.displayPolarity == Polarity.Supporting) result = chroma("rgb(30,100,30)");
		else result = chroma("rgb(100,30,30)");
	}

	if (type == "background") {
		result = chroma.mix(result, "black", 0.3); // mix background-color with black some
		result = result.alpha(0.9);
	}

	return result;
}

export function GetMapNodeTypeDisplayName(type: MapNodeType, parentNode: MapNode, parentNodeForm: ClaimForm, polarity: Polarity) {
	if (type == MapNodeType.Category) return "category";
	if (type == MapNodeType.Package) return "package";
	if (type == MapNodeType.MultiChoiceQuestion) return "multi-choice question";
	if (type == MapNodeType.Claim) {
		if (parentNode && parentNode.type == MapNodeType.Category) { return "claim (in question form)"; }
		return "claim";
	}
	if (type == MapNodeType.Argument) {
		return polarity == Polarity.Supporting ? "supporting argument" : "opposing argument";
	}
	Assert(false, "Invalid node type.");
}