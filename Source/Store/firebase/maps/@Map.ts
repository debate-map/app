export enum MapType {
	Personal = 10,
	Debate = 20,
	Global = 30,
}
export interface Map {
	_id: number;
	name: string;
	type: MapType;
	rootNode: number;
}