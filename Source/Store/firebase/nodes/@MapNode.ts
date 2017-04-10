import V from "../../../Frame/V/V";
import {_Enum, Enum, GetValues} from "../../../Frame/General/Enums";
import {MapNodeType, MapNodeType_Info} from "./@MapNodeType";
import {RatingType} from "../nodeRatings/@RatingType";
import {GetParentNode, IsLinkValid, IsNewLinkValid} from "../nodes";
import {PermissionGroupSet} from "../userExtras/@UserExtraInfo";

export enum AccessLevel {
	Base = 10,
	Verified = 20,
	Manager = 30,
	Admin = 40,
}

export enum ThesisForm {
	Base = 10,
	Negation = 20,
	YesNoQuestion = 30,
}

export enum MetaThesis_IfType {
	Any = 10,
	All = 20,
}
export enum MetaThesis_ThenType {
	StrengthenParent = 10,
	GuaranteeParentTrue = 20,
	WeakenParent = 30,
	GuaranteeParentFalse = 40,
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
		return node.metaThesis ? "3px 4px" : "5px 5px 4px 5px";
	}
	static GetMainRatingTypes(node: MapNode): RatingType[] {
		if (node._id < 100) // if static category, don't have any voting
			return [];
		if (node.metaThesis) {
			if (node.metaThesis.thenType == MetaThesis_ThenType.StrengthenParent || node.metaThesis.thenType == MetaThesis_ThenType.WeakenParent)
				return ["adjustment"];
			return ["probability"];
		}
		return MapNodeType_Info.for[node.type].mainRatingTypes;
	}

	constructor(initialData: {type: MapNodeType, creator: string} & Partial<MapNode>) {
		this.Extend(initialData);
		this.createdAt = Date.now();
	}

	_id?: number;
	type?: MapNodeType;
	titles: {[key: string]: string};

	creator?: string;
	createdAt: number;
	approved = false;
	accessLevel = AccessLevel.Base;
	voteLevel = AccessLevel.Base;

	quote: {
		author: string;
		text: string;
	};
	metaThesis: {
		ifType: MetaThesis_IfType;
		thenType: MetaThesis_ThenType;		
	};

	// averages from server
	/*agrees = 0;
	degree = 0;
	disagrees = 0;
	weight = 0;*/
	
	children = new ChildCollection();
	talkRoot: number;
}
export class ChildCollection {
	[key: number]: {_?, form?: ThesisForm};
}
/*export interface ChildInfo {
	id: number;
	type;
}*/

export function GetThesisFormAtPath(node: MapNode, path: string) {
	let parent = GetParentNode(path);
	if (parent == null) return ThesisForm;
	let link = parent.children.Props.First(a=>a.name == node._id.toString());
	return link.value.form;
}

export function GetNodeDisplayText(node: MapNode, formOrPath: ThesisForm | string) {
	if (node.type == MapNodeType.Thesis) {
		if (node.quote)
			return `The quote below is authentic and unmodified.`;

		let form = typeof formOrPath == "string" ? GetThesisFormAtPath(node, formOrPath) : formOrPath;
		if (node.metaThesis) {
			return `If ${MetaThesis_IfType[node.metaThesis.ifType].toLowerCase()} premises below are true, they ${
				MetaThesis_ThenType_Info.for[MetaThesis_ThenType[node.metaThesis.thenType]].displayText}.`;
		}
		if (form == ThesisForm.Negation)
			return node.titles["negation"];
		if (form == ThesisForm.YesNoQuestion)
			return node.titles["yesNoQuestion"];
	}
	return node.titles["base"];	
}
export function GetNodeSubDisplayText(node: MapNode) {
	if (node.type == MapNodeType.Thesis && node.quote)
		return `"${node.quote.text}" --${node.quote.author}`;
	return null;
}

export function GetValidChildTypes(nodeType: MapNodeType, path: string) {
	let nodeTypes = GetValues<MapNodeType>(MapNodeType);
	let validChildTypes = nodeTypes.filter(type=>IsLinkValid(nodeType, path, {type} as any));
	return validChildTypes;
}
export function GetValidNewChildTypes(nodeType: MapNodeType, path: string, permissions: PermissionGroupSet) {
	let nodeTypes = GetValues<MapNodeType>(MapNodeType);
	let validChildTypes = nodeTypes.filter(type=>IsNewLinkValid(nodeType, path, {type} as any, permissions));
	return validChildTypes;
}