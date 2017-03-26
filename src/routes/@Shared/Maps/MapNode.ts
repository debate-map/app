import V from "../../../Frame/V/V";
import {_Enum, Enum} from "../../../Frame/General/Enums";
import {RatingType} from "./MapNode/RatingType";
import {MapNodeType, MapNodeType_Info} from "./MapNodeType";

export enum AccessLevel {
	Base = 0,
	Verified = 1,
	Manager = 2,
	Admin = 3,
}

export class MapNode {
	constructor(initialData: {type: MapNodeType, title: string, creator: string} & Partial<MapNode>) {
		this.Extend(initialData);
	}

	_id?: number;
	type?: MapNodeType;
	title?: string;

	creator?: string;
	approved = false;
	accessLevel = AccessLevel.Base;
	voteLevel = AccessLevel.Base;

	agrees = 0;
	degree = 0;
	disagrees = 0;
	weight = 0;
	
	children = new ChildCollection();
	talkRoot: number;
}
export class ChildCollection {
	[key: number]: {};
}
/*export interface ChildInfo {
	id: number;
	type;
}*/