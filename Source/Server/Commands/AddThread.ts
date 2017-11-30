import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {Map} from "../../Store/firebase/maps/@Map";
import AddNode from "./AddNode";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {UserEdit} from "Server/CommandMacros";
import {Thread} from "../../Store/firebase/forum/@Thread";
import {Post} from "Store/firebase/forum/@Post";
import AddPost from "./AddPost";

@UserEdit
export default class AddThread extends Command<{thread: Thread, post: Post}> {
	threadID: number;
	sub_addPost: AddPost;
	async Prepare() {
		let {thread, post} = this.payload;

		let lastThreadID = await GetDataAsync("forum", "general", "lastThreadID") as number;
		this.threadID = lastThreadID + 1;
		thread.createdAt = Date.now();
		//thread.editedAt = thread.createdAt;

		this.sub_addPost = new AddPost({threadID: this.threadID, post});
		this.sub_addPost.Validate_Early();
		await this.sub_addPost.Prepare();

		thread.posts = [this.sub_addPost.postID];

		this.returnData = this.threadID;
	}
	async Validate() {
		let {thread} = this.payload;
		AssertValidate("Thread", thread, `Thread invalid`);
		await this.sub_addPost.Validate();
	}
	
	GetDBUpdates() {
		let {thread} = this.payload;
		let updates = {
			"forum/general/lastThreadID": this.threadID,
			[`forum/threads/${this.threadID}`]: thread,
		} as any;
		updates = MergeDBUpdates(updates, this.sub_addPost.GetDBUpdates());
		return updates;
	}
}