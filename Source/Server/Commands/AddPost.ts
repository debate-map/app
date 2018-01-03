import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import { UserEdit, MapEdit } from "Server/CommandMacros";
import {Post} from "firebase-forum";

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