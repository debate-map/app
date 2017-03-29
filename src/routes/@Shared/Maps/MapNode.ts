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

export enum MetaThesis_IfType {
	Any = 0,
	All = 1,
}
export enum MetaThesis_ThenType {
	StrengthenParent = 0,
	GuaranteeParentTrue = 1,
	WeakenParent = 2,
	GuaranteeParentFalse = 3,
}
export class MetaThesis_ThenType_Info {
	static for = {
		StrengthenParent: {displayText: "strengthen the parent"},
		GuaranteeParentTrue: {displayText: "guarantee the parent true"},
		WeakenParent: {displayText: "weaken the parent"},
		GuaranteeParentFalse: {displayText: "guarantee the parent false"},
	} as {[key: string]: MetaThesis_ThenType_Info};

	displayText: string;
}

export class MapNode {
	static GetFontSize(node: MapNode) {
		return node.metaThesis ? 11 : 14;
	}
	static GetPadding(node: MapNode) {
		return node.metaThesis ? "0 4px" : 5;
	}
	static GetDisplayText(node: MapNode) {
		if (node.metaThesis) {
			return `If ${MetaThesis_IfType[node.metaThesis_ifType].toLowerCase()} premises below are true, they ${
				MetaThesis_ThenType_Info.for[MetaThesis_ThenType[node.metaThesis_thenType]].displayText}.`;
		}
		return node.title;
	}
	static GetMainRatingTypes(node: MapNode) {
		if (node._id < 100) // if static category, don't have any voting
			return [];
		if (node.metaThesis) {
			if (node.metaThesis_thenType == MetaThesis_ThenType.StrengthenParent || node.metaThesis_thenType == MetaThesis_ThenType.WeakenParent)
				return ["adjustment"];
			return ["probability"];
		}
		return MapNodeType_Info.for[node.type].mainRatingTypes;
	}

	constructor(initialData: {type: MapNodeType, creator: string} & Partial<MapNode>) {
		this.Extend(initialData);
	}

	_id?: number;
	type?: MapNodeType;
	title?: string;

	creator?: string;
	createdAt: number;
	approved = false;
	accessLevel = AccessLevel.Base;
	voteLevel = AccessLevel.Base;

	metaThesis = false;
	metaThesis_ifType = null as MetaThesis_IfType;
	metaThesis_thenType = null as MetaThesis_ThenType;

	// averages from server
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