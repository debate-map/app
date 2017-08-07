import {GetNodeParentsAsync} from "../../Store/firebase/nodes";
import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {IsArgumentNode} from "../../Store/firebase/nodes/$node";
import {Map} from "../../Store/firebase/maps/@Map";
import DeleteNode from "Server/Commands/DeleteNode";
import {UserEdit} from "Server/CommandMacros";
import {Subforum} from "../../Store/firebase/forum/@Subforum";
import {ShowMessageBox} from "../../Frame/UI/VMessageBox";
import {GetAsync} from "Frame/Database/DatabaseHelpers";
import {GetThreadPosts, GetThread, GetPost} from "../../Store/firebase/forum";
import {Post} from "Store/firebase/forum/@Post";

@UserEdit
export default class DeletePost extends Command<{postID: number}> {
	oldData: Post;
	thread_oldPosts: number[];
	//timeSinceCreation: number;
	async Prepare() {
		let {postID} = this.payload;
		this.oldData = await GetAsync(()=>GetPost(postID));
		let thread = await GetAsync(()=>GetThread(this.oldData.thread));
		this.thread_oldPosts = thread.posts;
		//this.timeSinceCreation = Date.now() - this.oldData.createdAt;
	}
	async Validate() {}

	GetDBUpdates() {
		let {postID} = this.payload;
		let updates = {};
		//if (this.timeSinceCreation < 20 * 60 * 1000) { // if younger than 20 minutes, allow complete deletion
		if (this.thread_oldPosts.Last() == postID) { // if there are no later responses, allow complete deletion
			updates[`forum/threads/${this.oldData.thread}/posts`] = this.thread_oldPosts.Except(postID);
			updates[`forum/posts/${postID}`] = null;
		} else {
			updates[`forum/posts/${postID}/text`] = null;
			updates[`forum/posts/${postID}/editedAt`] = Date.now();
		}
		return updates;
	}
}