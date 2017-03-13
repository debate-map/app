export enum MapType {
	None = 0,
	Personal = 1,
	Debate = 2,
	Global = 3,
}
export interface Map {
	name: string;
	type: MapType;
	rootNode: string;
}