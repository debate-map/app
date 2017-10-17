export class Timeline {
	constructor(initialData: {name: string, creator: string} & Partial<Timeline>) {
		this.Extend(initialData);
	}

	_id: number;
	mapID: number;
	name: string;
	creator: string;
	createdAt: number;

	steps: number[];
}
AddSchema({
	properties: {
		mapID: {type: "number"},
		name: {type: "string"},
		creator: {type: "string"},
		createdAt: {type: "number"},

		steps: {items: {type: "number"}},
	},
	required: ["mapID", "name", "creator", "createdAt"],
}, "Timeline");