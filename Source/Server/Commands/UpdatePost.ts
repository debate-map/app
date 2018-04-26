import { Post } from "firebase-forum";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { Command } from "../Command";
import { UserEdit } from "../CommandMacros";

AddSchema({
	properties: {
		postID: {type: "number"},
		postUpdates: Schema({
			properties: {
				text: {type: "string"},
			},
		}),
	},
	required: ["postID", "postUpdates"],
}, "UpdatePost_payload");

@UserEdit
export class UpdatePost extends Command<{postID: number, postUpdates: Partial<Post>}> {
	Validate_Early() {
		AssertValidate("UpdatePost_payload", this.payload, `Payload invalid`);
	}

	oldData: Post;
	newData: Post;
	async Prepare() {
		let {postID, postUpdates} = this.payload;
		this.oldData = await GetDataAsync({addHelpers: false}, "forum", "posts", postID) as Post;
		this.newData = {...this.oldData, ...postUpdates};
		this.newData.editedAt = Date.now();
	}
	async Validate() {
		AssertValidate("Post", this.newData, `New post-data invalid`);
	}
	
	GetDBUpdates() {
		let {postID} = this.payload;
		let updates = {};
		updates[`forum/posts/${postID}`] = this.newData;
		return updates;
	}
}