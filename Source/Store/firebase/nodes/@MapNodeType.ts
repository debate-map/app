import {Assert} from "js-vextensions";
import {RatingType} from "../nodeRatings/@RatingType";
import {MapNode, MapNodeL2, ClaimForm, MapNodeL3, Polarity} from "./@MapNode";

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
			/*mainRatingTypes: ["significance"],
			otherRatingTypes: [],*/
		}),
		[MapNodeType.Package]: new MapNodeType_Info({
			childTypes: [MapNodeType.Claim],
			minWidth: 100, maxWidth: 250,
			/*mainRatingTypes: ["significance"],
			otherRatingTypes: [],*/
		}),
		[MapNodeType.MultiChoiceQuestion]: new MapNodeType_Info({
			childTypes: [MapNodeType.Claim],
			minWidth: 100, maxWidth: 250,
			//minWidth: 100, maxWidth: 200, backgroundColor: "230,150,50",
			/*mainRatingTypes: ["significance"],
			otherRatingTypes: [],*/
		}),
		[MapNodeType.Claim]: new MapNodeType_Info({
			childTypes: [MapNodeType.Argument, MapNodeType.Argument],
			minWidth: 350, maxWidth: 550,
			//mainRatingTypes: ["probability", "intensity"],
			//mainRatingTypes: ["probability", "support"],
			/*mainRatingTypes: ["probability", "degree"],
			otherRatingTypes: [],*/
		}),
		[MapNodeType.Argument]: new MapNodeType_Info({
			childTypes: [MapNodeType.Claim],
			minWidth: 100, maxWidth: 300,
			/*mainRatingTypes: ["strength"],
			otherRatingTypes: [],*/
		}),
	} as {[key: string]: MapNodeType_Info};

	private constructor(info: Partial<MapNodeType_Info>) {
		this.Extend(info);
	}

	//displayName: (parentNode: MapNodeL2)=>string;
	childTypes: MapNodeType[];
	minWidth: number;
	maxWidth: number;
	backgroundColor: string;
	//fontSize?: number;
	//get fontSize() { return 14; }
	/*mainRatingTypes: RatingType[];
	otherRatingTypes: RatingType[];*/
}
export function GetNodeBackgroundColor(node: MapNodeL3) {
	if (node.type == MapNodeType.Category) return "40,60,80";
	if (node.type == MapNodeType.Package) return "30,120,150";
	if (node.type == MapNodeType.MultiChoiceQuestion) return "90,50,180";
	if (node.type == MapNodeType.Claim) return "0,80,150";
	if (node.type == MapNodeType.Argument) {
		if (node.finalPolarity == Polarity.Supporting) return "30,100,30";
		return "100,30,30";
	}
	Assert(false, "Invalid node type.");
}

export function GetMapNodeTypeDisplayName(type: MapNodeType, parentNode: MapNode, parentNodeForm: ClaimForm, polarity: Polarity) {
	if (type == MapNodeType.Category) return "category";
	if (type == MapNodeType.Package) return "package";
	if (type == MapNodeType.MultiChoiceQuestion) return "multi-choice question";
	if (type == MapNodeType.Claim) {
		if (parentNode && parentNode.type == MapNodeType.Category)
			return "yes-no question (claim)";
		return "claim";
	}
	if (type == MapNodeType.Argument) {
		return polarity == Polarity.Supporting ? "supporting argument" : "opposing argument";
	}
	Assert(false, "Invalid node type.");
}