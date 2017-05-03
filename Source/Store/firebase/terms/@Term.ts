export class Term {
	constructor(initialData: {creator: string} & Partial<Term>) {
		this.Extend(initialData);
		this.createdAt = Date.now();
	}

	_id?: number;
	titles: {[key: string]: string};

	creator?: string;
	createdAt: number;

	components: TermComponent[];
}
AddSchema({
	properties: {
		// todo
	},
}, "Term");

export class TermComponent {
	// todo
}
AddSchema({
	properties: {
		// todo
	},
}, "TermComponent");