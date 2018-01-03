import {GetNodeParentsAsync} from "../../Store/firebase/nodes";
import {Assert} from "js-vextensions";
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
import {Subforum} from "firebase-forum";
import {ShowMessageBox} from "react-vmessagebox";
import {GetAsync} from "Frame/Database/DatabaseHelpers";
import {GetThreadPosts, GetThread} from "firebase-forum";
import {Post} from "firebase-forum";

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