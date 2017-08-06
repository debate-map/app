export class Post {
	constructor(initialData: Partial<Post>) {
		this.Extend(initialData);
	}

	_id: number;
	text: string;

	creator: string;
	createdAt: number;
}

AddSchema({
	properties: {
		text: {type: "string"},
		
		creator: {type: "string"},
		createdAt: {type: "number"},
	},
	required: ["text", "creator", "createdAt"],
}, "Post");