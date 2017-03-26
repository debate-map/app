export enum MapType {
	None = 0,
	Personal = 1,
	Debate = 2,
	Global = 3,
}
export interface Map {
	_id: number;
	name: string;
	type: MapType;
	rootNode: number;
}