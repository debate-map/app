export class Thread {
	constructor(initialData: Partial<Thread>) {
		this.Extend(initialData);
	}

	_id: number;
	title: string;
	subforum: number;

	posts: number[];

	creator: string;
	createdAt: number;
}

AddSchema({
	properties: {
		title: {type: "string"},
		subforum: {type: "number"},

		posts: {items: {type: "number"}},

		creator: {type: "string"},
		createdAt: {type: "number"},
	},
	required: ["title", "subforum", "creator", "createdAt"],
}, "Thread");