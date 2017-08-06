export class Subforum {
	constructor(initialData: Partial<Subforum>) {
		this.Extend(initialData);
	}

	_id: number;
	name: string;
}

export const Subforum_nameFormat = `^[a-zA-Z0-9 ,-]+$`;
AddSchema({
	properties: {
		name: {type: "string", pattern: Subforum_nameFormat},
	},
	required: ["name"],
}, "Subforum");