import { UserEdit } from "Server/CommandMacros";
import { Post } from "firebase-forum";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { Command } from "../Command";

@UserEdit
export default class AddPost extends Command<{threadID: number, post: Post}> {
	Validate_Early() {
		let {threadID, post} = this.payload;
	}

	postID: number;
	thread_oldPosts: number[];
	async Prepare() {
		let {threadID, post} = this.payload;
		let firebase = store.firebase.helpers;

		let lastPostID = await GetDataAsync("forum", "general", "lastPostID") as number;
		this.postID = lastPostID + 1;
		post.thread = threadID;
		post.creator = this.userInfo.id;
		post.createdAt = Date.now();

		this.thread_oldPosts = await GetDataAsync("forum", "threads", threadID, "posts") || [];

		this.returnData = this.postID;
	}
	async Validate() {
		let {post} = this.payload;
		AssertValidate(`Post`, post, `Post invalid`);
	}
	
	GetDBUpdates() {
		let {threadID, post} = this.payload;

		let updates = {};
		// add post
		updates["forum/general/lastPostID"] = this.postID;
		updates[`forum/posts/${this.postID}`] = post;

		// add to thread
		updates[`forum/threads/${threadID}/posts`] = this.thread_oldPosts.concat(this.postID);

		return updates;
	}
}