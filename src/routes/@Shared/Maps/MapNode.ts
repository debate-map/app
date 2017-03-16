import V from "../../../Frame/V/V";
import {_Enum, Enum} from "../../../Frame/General/Enums";

export enum MapNodeType {
	None = 0,
	Category = 1,
	Package = 2,
	Thesis = 3,
	PositiveArgument = 4,
	NegativeArgument = 5,
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

export interface ChildCollection {
	//[key: string]?: boolean;
}
/*export interface ChildInfo {
	id: number;
	type;
}*/

export interface MapNode {
	_key?: string;
	type: Partial<MapNodeType>;
	title: string;
	agrees: number;
	degree: number;
	disagrees: number;
	weight: number;
	creator: string;
	approved: boolean;
	accessLevel: AccessLevel;
	voteLevel: AccessLevel;
	children: ChildCollection;
	talkChildren: ChildCollection;
}