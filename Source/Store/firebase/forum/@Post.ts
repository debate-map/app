export class Post {
	constructor(initialData: {creator: string} & Partial<Post>) {
		this.Extend(initialData);
	}

	_id: number;
	thread: number;
	text = "";

	creator: string;
	createdAt: number;
}

AddSchema({
	properties: {
		thread: {type: "number"},
		text: {type: "string"},
		
		creator: {type: "string"},
		createdAt: {type: "number"},
	},
	required: ["text", "creator", "createdAt"],
}, "Post");