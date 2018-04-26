import { GetAsync } from "Frame/Database/DatabaseHelpers";
import { UserEdit } from "Server/CommandMacros";
import { GetThread, GetThreadPosts, Post } from "firebase-forum";
import { Command } from "../Command";

@UserEdit
export default class DeleteThread extends Command<{threadID: number}> {
	posts: Post[];
	async Prepare() {
		let {threadID} = this.payload;
		let thread = await GetAsync(()=>GetThread(threadID))
		this.posts = await GetAsync(()=>GetThreadPosts(thread));
	}
	async Validate() {
		if (this.posts.filter(a=>a.creator != this.userInfo.id && a.text).length) {
			throw new Error(`Threads with responses by other people cannot be deleted.`);
		}
	}

	GetDBUpdates() {
		let {threadID} = this.payload;
		let updates = {};
		updates[`forum/threads/${threadID}`] = null;
		for (let post of this.posts) {
			updates[`forum/posts/${post._id}`] = null;
		}
		return updates;
	}
}