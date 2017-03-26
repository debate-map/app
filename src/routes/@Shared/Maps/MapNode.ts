import V from "../../../Frame/V/V";
import {_Enum, Enum} from "../../../Frame/General/Enums";
import {RatingType} from "./MapNode/RatingType";

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
			backgroundColor: "40,60,80",
			mainRatingTypes: ["significance"],
			otherRatingTypes: [],
		}),
		[MapNodeType.Package]: new MapNodeType_Info({
			displayName: "package",
			childTypes: [MapNodeType.Thesis],
			backgroundColor: "40,60,80",
			mainRatingTypes: ["significance"],
			otherRatingTypes: [],
		}),
		[MapNodeType.Thesis]: new MapNodeType_Info({
			displayName: "thesis (as premise)",
			childTypes: [MapNodeType.SupportingArgument, MapNodeType.OpposingArgument],
			backgroundColor: "0,80,150",
			mainRatingTypes: ["probability", "adjustment"],
			otherRatingTypes: [],
		}),
		[MapNodeType.SupportingArgument]: new MapNodeType_Info({
			displayName: "supporting argument",
			childTypes: [MapNodeType.Thesis],
			backgroundColor: "30,100,30",
			mainRatingTypes: [],
			otherRatingTypes: [],
		}),
		[MapNodeType.OpposingArgument]: new MapNodeType_Info({
			displayName: "opposing argument",
			childTypes: [MapNodeType.Thesis],
			backgroundColor: "100,30,30",
			mainRatingTypes: [],
			otherRatingTypes: [],
		}),
	} as {[key: string]: MapNodeType_Info};

	private constructor(info: Partial<MapNodeType_Info>) {
		this.Extend({info});
	}

	displayName: string;
	childTypes: MapNodeType[];
	backgroundColor: string;
	//fontSize?: number;
	get fontSize() { return 14; }
	mainRatingTypes: RatingType[];
	otherRatingTypes: RatingType[];

}
// if any premises below are [true/false], they [strengthen/weaken/guarantee] the parent [/true/false]

export enum AccessLevel {
	Base = 0,
	Verified = 1,
	Manager = 2,
	Admin = 3,
}

export class ChildCollection {
	[key: number]: {};
}
/*export interface ChildInfo {
	id: number;
	type;
}*/

export class MapNode {
	constructor(initialData: {type: MapNodeType, title: string, creator: string} & Partial<MapNode>) {
		this.Extend(initialData);
	}

	_key? = null as string;
	type = null as MapNodeType;
	title = null as string;

	creator = null as string;
	approved = false;
	accessLevel = AccessLevel.Base;
	voteLevel = AccessLevel.Base;

	agrees = 0;
	degree = 0;
	disagrees = 0;
	weight = 0;
	
	children = new ChildCollection();
	talkRoot = null as number;
}