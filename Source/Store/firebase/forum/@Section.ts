export class Section {
	constructor(initialData: Partial<Section>) {
		this.Extend(initialData);
	}

	_id: number;
	name: string;
	//subforums: SubforumSet;
	subforumOrder: number[];
}

export const Section_nameFormat = `^[a-zA-Z0-9 ,\\-()]+$`;
AddSchema({
	properties: {
		name: {type: "string", pattern: Section_nameFormat},
		subforumOrder: {items: {type: "number"}},
	},
	required: ["name"],
}, "Section");