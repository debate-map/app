import {RatingType} from "../nodeRatings/@RatingType";

export enum MapNodeType {
	None = 0,
	Category = 1,
	Package = 2,
	Thesis = 3,
	SupportingArgument = 4,
	OpposingArgument = 5,
}
export class MapNodeType_Info {
	static for = {
		[MapNodeType.Category]: new MapNodeType_Info({
			displayName: "category",
			childTypes: [MapNodeType.Category, MapNodeType.Package, MapNodeType.Thesis],
			minWidth: 100, maxWidth: 200, backgroundColor: "40,60,80",
			mainRatingTypes: ["significance"],
			otherRatingTypes: [],
		}),
		[MapNodeType.Package]: new MapNodeType_Info({
			displayName: "package",
			childTypes: [MapNodeType.Thesis],
			minWidth: 100, maxWidth: 200, backgroundColor: "30,120,150",
			mainRatingTypes: ["significance"],
			otherRatingTypes: [],
		}),
		[MapNodeType.Thesis]: new MapNodeType_Info({
			displayName: "thesis (as premise)",
			childTypes: [MapNodeType.SupportingArgument, MapNodeType.OpposingArgument],
			minWidth: 350, maxWidth: 550, backgroundColor: "0,80,150",
			mainRatingTypes: ["probability", "idealIntensity"],
			otherRatingTypes: [],
		}),
		[MapNodeType.SupportingArgument]: new MapNodeType_Info({
			displayName: "supporting argument",
			childTypes: [MapNodeType.Thesis],
			minWidth: 100, maxWidth: 300, backgroundColor: "30,100,30",
			mainRatingTypes: ["strength"],
			otherRatingTypes: [],
		}),
		[MapNodeType.OpposingArgument]: new MapNodeType_Info({
			displayName: "opposing argument",
			childTypes: [MapNodeType.Thesis],
			minWidth: 100, maxWidth: 300, backgroundColor: "100,30,30",
			mainRatingTypes: ["strength"],
			otherRatingTypes: [],
		}),
	} as {[key: string]: MapNodeType_Info};

	private constructor(info: Partial<MapNodeType_Info>) {
		this.Extend(info);
	}

	displayName: string;
	childTypes: MapNodeType[];
	minWidth: number;
	maxWidth: number;
	backgroundColor: string;
	//fontSize?: number;
	//get fontSize() { return 14; }
	mainRatingTypes: RatingType[];
	otherRatingTypes: RatingType[];
}