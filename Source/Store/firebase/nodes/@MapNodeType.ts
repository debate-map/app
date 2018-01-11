import {Assert} from "js-vextensions";
import {RatingType} from "../nodeRatings/@RatingType";
import {MapNode, MapNodeL2, ThesisForm} from "./@MapNode";

export enum MapNodeType {
	Category = 10,
	Package = 20,
	MultiChoiceQuestion = 30,
	Thesis = 40,
	SupportingArgument = 50,
	OpposingArgument = 60,
}
export class MapNodeType_Info {
	static for = {
		[MapNodeType.Category]: new MapNodeType_Info({
			childTypes: [MapNodeType.Category, MapNodeType.Package, MapNodeType.MultiChoiceQuestion, MapNodeType.Thesis],
			minWidth: 100, maxWidth: 250, backgroundColor: "40,60,80",
			/*mainRatingTypes: ["significance"],
			otherRatingTypes: [],*/
		}),
		[MapNodeType.Package]: new MapNodeType_Info({
			childTypes: [MapNodeType.Thesis],
			minWidth: 100, maxWidth: 250, backgroundColor: "30,120,150",
			/*mainRatingTypes: ["significance"],
			otherRatingTypes: [],*/
		}),
		[MapNodeType.MultiChoiceQuestion]: new MapNodeType_Info({
			childTypes: [MapNodeType.Thesis],
			minWidth: 100, maxWidth: 250, backgroundColor: "90,50,180",
			//minWidth: 100, maxWidth: 200, backgroundColor: "230,150,50",
			/*mainRatingTypes: ["significance"],
			otherRatingTypes: [],*/
		}),
		[MapNodeType.Thesis]: new MapNodeType_Info({
			childTypes: [MapNodeType.SupportingArgument, MapNodeType.OpposingArgument],
			minWidth: 350, maxWidth: 550, backgroundColor: "0,80,150",
			//mainRatingTypes: ["probability", "intensity"],
			//mainRatingTypes: ["probability", "support"],
			/*mainRatingTypes: ["probability", "degree"],
			otherRatingTypes: [],*/
		}),
		[MapNodeType.SupportingArgument]: new MapNodeType_Info({
			childTypes: [MapNodeType.Thesis],
			minWidth: 100, maxWidth: 300, backgroundColor: "30,100,30",
			/*mainRatingTypes: ["strength"],
			otherRatingTypes: [],*/
		}),
		[MapNodeType.OpposingArgument]: new MapNodeType_Info({
			childTypes: [MapNodeType.Thesis],
			minWidth: 100, maxWidth: 300, backgroundColor: "100,30,30",
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

export function GetMapNodeTypeDisplayName(type: MapNodeType, parentNode: MapNode, parentNodeForm: ThesisForm) {
	if (type == MapNodeType.Category) return "category";
	if (type == MapNodeType.Package) return "package";
	if (type == MapNodeType.MultiChoiceQuestion) return "multi-choice question";
	if (type == MapNodeType.Thesis) {
		if (parentNode && parentNode.type == MapNodeType.Category)
			return "yes-no question (thesis)";
		return "thesis";
	}
	if (type == MapNodeType.SupportingArgument) {
		//if (parent.finalType != parent.type) return "opposing argument";
		if (parentNodeForm == ThesisForm.Negation) return "opposing argument";
		return "supporting argument";
	}
	if (type == MapNodeType.OpposingArgument) {
		//if (parent.finalType != parent.type) return "supporting argument";
		//if (IsContextReversed( parent.finalType != parent.type) return "supporting argument";
		if ( parentNodeForm == ThesisForm.Negation) return "supporting argument";
		return "opposing argument";
	}
	Assert(false);
}