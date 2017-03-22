import V from "../../../../Frame/V/V";
import {_Enum, Enum} from "../../../../Frame/General/Enums";

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
		[MapNodeType.Category]: new MapNodeType_Info("category", [MapNodeType.Category, MapNodeType.Package, MapNodeType.Thesis]),
		[MapNodeType.Package]: new MapNodeType_Info("package", [MapNodeType.Thesis]),
		[MapNodeType.Thesis]: new MapNodeType_Info("thesis", [MapNodeType.SupportingArgument, MapNodeType.OpposingArgument]),
		[MapNodeType.SupportingArgument]: new MapNodeType_Info("supporting argument", [MapNodeType.Thesis]),
		[MapNodeType.OpposingArgument]: new MapNodeType_Info("opposing argument", [MapNodeType.Thesis]),
	} as {[key: string]: MapNodeType_Info};

	constructor(displayName: string, childTypes: MapNodeType[]) {
		this.displayName = displayName;
		this.childTypes = childTypes;
	}

	displayName: string;
	childTypes: MapNodeType[];
}
/*@_Enum export class MapNodeType extends Enum { static V: MapNodeType;
	None = 0 as any as MapNodeType
	Category = 1 as any as MapNodeType
	Package = 2 as any as MapNodeType
	Thesis = 3 as any as MapNodeType
	PositiveArgument = 4 as any as MapNodeType
	NegativeArgument = 5 as any as MapNodeType

	// since in db, we actually want to store this Enum's values as integers
	toString() { return this.value as any; }
}*/

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