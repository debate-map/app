import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ClaimForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {Map_namePattern, Map} from "../../Store/firebase/maps/@Map";
import {UserEdit} from "../CommandMacros";
import {MapEdit} from "Server/CommandMacros";
import {Post} from "firebase-forum";

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