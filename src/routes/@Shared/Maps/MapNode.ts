export enum MapNodeType {
	None = 0,
	Category = 1,
	Package = 2,
	Thesis = 3,
	PositiveArgument = 4,
	NegativeArgument = 5,
}
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
	type: 
}*/

export interface MapNode {
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